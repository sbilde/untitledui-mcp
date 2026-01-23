import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { UntitledUIClient } from "./api/client.js";
import { MemoryCache, CACHE_TTL } from "./cache/memory-cache.js";
import { fuzzySearch, type SearchableItem } from "./utils/search.js";
import { generateDescription } from "./utils/descriptions.js";
import type { ComponentListItem, MCPComponentResponse } from "./api/types.js";

export function createServer(licenseKey: string) {
  const client = new UntitledUIClient(licenseKey);
  const cache = new MemoryCache();

  const server = new Server(
    {
      name: "untitledui-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Helper: Build searchable index
  async function buildSearchIndex(): Promise<SearchableItem[]> {
    const cacheKey = "search:index";
    const cached = cache.get<SearchableItem[]>(cacheKey);
    if (cached) return cached;

    const items: SearchableItem[] = [];
    const types = await client.listComponentTypes();

    for (const type of types) {
      const components = await client.listComponents(type);
      for (const comp of components) {
        if (comp.type === "dir" && comp.count) {
          // Has variants - fetch them
          const variants = await client.listComponents(type, comp.name);
          for (const variant of variants) {
            items.push({
              name: variant.name,
              type,
              fullPath: `${type}/${comp.name}/${variant.name}`,
            });
          }
        } else {
          items.push({
            name: comp.name,
            type,
            fullPath: `${type}/${comp.name}`,
          });
        }
      }
    }

    cache.set(cacheKey, items, CACHE_TTL.componentList);
    return items;
  }

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_component_types",
        description: "List all available component categories (application, base, marketing, etc.)",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_components",
        description: "List components in a category. Use subfolder for variants (e.g., type='application', subfolder='modals')",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Component type (application, base, foundations, marketing, shared-assets)" },
            subfolder: { type: "string", description: "Optional subfolder for variants (e.g., 'modals', 'slideout-menus')" },
          },
          required: ["type"],
        },
      },
      {
        name: "search_components",
        description: "Search for components by name across all categories",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_component",
        description: "Get a single component's code. Does NOT include dependencies - use get_component_with_deps for that.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Component type" },
            name: { type: "string", description: "Component name (e.g., 'button' or 'modals/ai-assistant-modal')" },
          },
          required: ["type", "name"],
        },
      },
      {
        name: "get_component_with_deps",
        description: "Get a component with all its base component dependencies included",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Component type" },
            name: { type: "string", description: "Component name" },
          },
          required: ["type", "name"],
        },
      },
      {
        name: "list_examples",
        description: "List available page examples (dashboards, marketing pages, etc.)",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_example",
        description: "Get a complete page example with all files",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Example name (e.g., 'application', 'marketing')" },
          },
          required: ["name"],
        },
      },
      {
        name: "validate_license",
        description: "Verify that the license key is valid",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "clear_cache",
        description: "Clear cached data. Optionally specify a pattern to clear specific entries.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Optional pattern to match (e.g., 'component:' clears all component cache)" },
          },
        },
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_component_types": {
          const cacheKey = "types";
          let types = cache.get<string[]>(cacheKey);
          if (!types) {
            types = await client.listComponentTypes();
            cache.set(cacheKey, types, CACHE_TTL.componentTypes);
          }
          return { content: [{ type: "text", text: JSON.stringify({ types }, null, 2) }] };
        }

        case "list_components": {
          const { type, subfolder } = args as { type: string; subfolder?: string };
          const cacheKey = subfolder ? `list:${type}:${subfolder}` : `list:${type}`;

          let components = cache.get<ComponentListItem[]>(cacheKey);
          if (!components) {
            components = await client.listComponents(type, subfolder);
            cache.set(cacheKey, components, CACHE_TTL.componentList);
          }

          return { content: [{ type: "text", text: JSON.stringify({ type, subfolder, components }, null, 2) }] };
        }

        case "search_components": {
          const { query } = args as { query: string };
          const index = await buildSearchIndex();
          const results = fuzzySearch(query, index);
          return { content: [{ type: "text", text: JSON.stringify({ query, results }, null, 2) }] };
        }

        case "get_component": {
          const { type, name: componentName } = args as { type: string; name: string };
          const cacheKey = `component:${type}:${componentName}`;

          let component = cache.get<MCPComponentResponse>(cacheKey);
          if (!component) {
            const fetched = await client.fetchComponent(type, componentName);
            if (!fetched) {
              // Not found - suggest alternatives
              const index = await buildSearchIndex();
              const suggestions = fuzzySearch(componentName, index, 5).map(r => r.fullPath);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    error: `Component "${componentName}" not found in ${type}`,
                    code: "NOT_FOUND",
                    suggestions,
                  }, null, 2),
                }],
              };
            }

            component = {
              name: fetched.name,
              type,
              description: generateDescription(fetched.name, type),
              files: fetched.files,
              dependencies: fetched.dependencies || [],
              devDependencies: fetched.devDependencies || [],
              baseComponents: (fetched.components || []).map(c => c.name),
            };
            cache.set(cacheKey, component, CACHE_TTL.componentCode);
          }

          return { content: [{ type: "text", text: JSON.stringify(component, null, 2) }] };
        }

        case "get_component_with_deps": {
          const { type, name: componentName } = args as { type: string; name: string };

          const primary = await client.fetchComponent(type, componentName);
          if (!primary) {
            const index = await buildSearchIndex();
            const suggestions = fuzzySearch(componentName, index, 5).map(r => r.fullPath);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: `Component "${componentName}" not found`,
                  code: "NOT_FOUND",
                  suggestions,
                }, null, 2),
              }],
            };
          }

          // Fetch base components
          const baseComponentNames = (primary.components || []).map(c => c.name);
          const baseComponents = baseComponentNames.length > 0
            ? await client.fetchComponents("base", baseComponentNames)
            : [];

          // Deduplicate dependencies
          const allDeps = new Set<string>();
          const allDevDeps = new Set<string>();

          [primary, ...baseComponents].forEach(c => {
            c.dependencies?.forEach(d => allDeps.add(d));
            c.devDependencies?.forEach(d => allDevDeps.add(d));
          });

          const result = {
            primary: {
              name: primary.name,
              type,
              description: generateDescription(primary.name, type),
              files: primary.files,
              dependencies: primary.dependencies || [],
              devDependencies: primary.devDependencies || [],
              baseComponents: baseComponentNames,
            },
            baseComponents: baseComponents.map(c => ({
              name: c.name,
              type: "base",
              description: generateDescription(c.name, "base"),
              files: c.files,
              dependencies: c.dependencies || [],
              devDependencies: c.devDependencies || [],
            })),
            totalFiles: primary.files.length + baseComponents.reduce((sum, c) => sum + c.files.length, 0),
            allDependencies: Array.from(allDeps),
            allDevDependencies: Array.from(allDevDeps),
          };

          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        case "list_examples": {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                examples: [
                  { name: "application", type: "application", description: "Dashboard application example" },
                  { name: "marketing", type: "marketing", description: "Marketing landing page example" },
                ],
              }, null, 2),
            }],
          };
        }

        case "get_example": {
          const { name: exampleName } = args as { name: string };
          const cacheKey = `example:${exampleName}`;

          let example = cache.get(cacheKey);
          if (!example) {
            example = await client.fetchExample(exampleName);
            if (example) {
              cache.set(cacheKey, example, CACHE_TTL.examples);
            }
          }

          return { content: [{ type: "text", text: JSON.stringify(example, null, 2) }] };
        }

        case "validate_license": {
          const valid = await client.validateLicense();
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                valid,
                message: valid ? "License key is valid" : "Invalid or missing license key",
              }, null, 2),
            }],
          };
        }

        case "clear_cache": {
          const { pattern } = args as { pattern?: string };
          let cleared: number;
          if (pattern) {
            cleared = cache.clearPattern(pattern);
          } else {
            cleared = cache.size();
            cache.clear();
          }
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ cleared, message: `Cleared ${cleared} cache entries` }, null, 2),
            }],
          };
        }

        default:
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: `Unknown tool: ${name}`, code: "UNKNOWN_TOOL" }, null, 2),
            }],
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: message, code: "API_ERROR" }, null, 2),
        }],
      };
    }
  });

  return server;
}

export async function runServer(licenseKey: string) {
  const server = createServer(licenseKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
