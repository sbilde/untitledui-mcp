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
import { getBaseComponentNames } from "./utils/parse-deps.js";
import {
  estimateComponentTokens,
  getFileTokenList,
  CLAUDE_READ_TOKEN_LIMIT,
  isLikelyTooLarge,
} from "./utils/tokens.js";
import type { ComponentListItem, MCPComponentResponse, ComponentFile } from "./api/types.js";

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
        description: "Get a single component's code with token estimates. Returns estimatedTokens and file list. If estimatedTokens > 25000, consider using get_component_file for specific files instead.",
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
        description: "Get a component with all base dependencies. Returns estimatedTokens. If response is too large (>25000 tokens), use get_component_file to fetch specific files individually.",
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
        name: "get_component_file",
        description: "Get a single file from a component. Use this when get_component or get_component_with_deps returns a large response (>25000 tokens). First call get_component to see the file list, then fetch specific files as needed.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Component type" },
            name: { type: "string", description: "Component name" },
            file: { type: "string", description: "File path within the component (e.g., 'Button.tsx' or 'variants/InputPhone.tsx')" },
          },
          required: ["type", "name", "file"],
        },
      },
      {
        name: "list_examples",
        description: "Browse available page examples. Call without path to see categories, then drill down.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to browse (e.g., '', 'application', 'application/dashboards-01')" },
          },
        },
      },
      {
        name: "get_example",
        description: "Get a single example page with all files. Requires full path including page number.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Full path to example page (e.g., 'application/dashboards-01/01')" },
          },
          required: ["path"],
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
              baseComponents: getBaseComponentNames(fetched.files),
            };
            cache.set(cacheKey, component, CACHE_TTL.componentCode);
          }

          // Add token estimates
          const estimatedTokens = estimateComponentTokens(component.files);
          const fileTokens = getFileTokenList(component.files);
          const tooLarge = isLikelyTooLarge(estimatedTokens);

          const result = {
            ...component,
            estimatedTokens,
            fileCount: component.files.length,
            fileList: fileTokens,
            ...(tooLarge && {
              warning: `Response is large (${estimatedTokens} tokens). Consider using get_component_file for specific files.`,
              hint: "Use get_component_file with type, name, and file path to fetch individual files.",
            }),
          };

          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
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

          // Parse base component dependencies from the code
          const baseComponentNames = getBaseComponentNames(primary.files);

          // Fetch base components
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

          // Calculate token estimates
          const allFiles = [
            ...primary.files,
            ...baseComponents.flatMap(c => c.files),
          ];
          const estimatedTokens = estimateComponentTokens(allFiles);
          const tooLarge = isLikelyTooLarge(estimatedTokens);

          const result = {
            primary: {
              name: primary.name,
              type,
              description: generateDescription(primary.name, type),
              files: primary.files,
              fileList: getFileTokenList(primary.files),
              dependencies: primary.dependencies || [],
              devDependencies: primary.devDependencies || [],
              baseComponents: baseComponentNames,
            },
            baseComponents: baseComponents.map(c => ({
              name: c.name,
              type: "base",
              description: generateDescription(c.name, "base"),
              files: c.files,
              fileList: getFileTokenList(c.files),
              dependencies: c.dependencies || [],
              devDependencies: c.devDependencies || [],
            })),
            totalFiles: primary.files.length + baseComponents.reduce((sum, c) => sum + c.files.length, 0),
            estimatedTokens,
            allDependencies: Array.from(allDeps),
            allDevDependencies: Array.from(allDevDeps),
            ...(tooLarge && {
              warning: `Response is large (${estimatedTokens} tokens, limit is ${CLAUDE_READ_TOKEN_LIMIT}). Consider using get_component_file for specific files.`,
              hint: "To fetch individual files, use get_component_file with the component type, name, and file path from fileList.",
            }),
          };

          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        case "get_component_file": {
          const { type, name: componentName, file: filePath } = args as { type: string; name: string; file: string };
          const cacheKey = `component:${type}:${componentName}`;

          // Try to get from cache first, otherwise fetch
          let files: ComponentFile[];
          const cached = cache.get<MCPComponentResponse>(cacheKey);
          if (cached) {
            files = cached.files;
          } else {
            const fetched = await client.fetchComponent(type, componentName);
            if (!fetched) {
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
            files = fetched.files;
          }

          // Find the requested file
          const file = files.find(f =>
            f.path === filePath ||
            f.path.endsWith(`/${filePath}`) ||
            f.path.endsWith(filePath)
          );

          if (!file) {
            const availableFiles = files.map(f => f.path);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: `File "${filePath}" not found in ${type}/${componentName}`,
                  code: "FILE_NOT_FOUND",
                  availableFiles,
                  hint: "Use one of the file paths from availableFiles",
                }, null, 2),
              }],
            };
          }

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                component: `${type}/${componentName}`,
                file: {
                  path: file.path,
                  code: file.code,
                },
                estimatedTokens: estimateComponentTokens([file]),
              }, null, 2),
            }],
          };
        }

        case "list_examples": {
          const { path = "" } = args as { path?: string };
          const cacheKey = `examples:list:${path}`;

          let listing = cache.get(cacheKey);
          if (!listing) {
            listing = await client.fetchExample(path);
            if (listing) {
              cache.set(cacheKey, listing, CACHE_TTL.componentList);
            }
          }

          // Format response based on type
          if (listing.type === "directory" && listing.results) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  path: path || "(root)",
                  type: "directory",
                  items: listing.results,
                  hint: path === ""
                    ? "Use list_examples with path='application' or path='marketing' to see available examples"
                    : path.split("/").length === 1
                    ? `Use list_examples with path='${path}/<example>' to see pages`
                    : `Use get_example with path='${path}/<page>' to fetch a specific page`,
                }, null, 2),
              }],
            };
          }

          return { content: [{ type: "text", text: JSON.stringify(listing, null, 2) }] };
        }

        case "get_example": {
          const { path: examplePath } = args as { path: string };
          const cacheKey = `example:${examplePath}`;

          let example = cache.get(cacheKey);
          if (!example) {
            example = await client.fetchExample(examplePath);
            if (example) {
              cache.set(cacheKey, example, CACHE_TTL.examples);
            }
          }

          // Check if we got actual content or just a directory listing
          if (example.type === "directory") {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: "Path is a directory, not a page",
                  path: examplePath,
                  availableItems: example.results,
                  hint: `Use get_example with path='${examplePath}/<item>' to fetch a specific page`,
                }, null, 2),
              }],
            };
          }

          if (example.type === "json-file" && example.content) {
            const files = example.content.files || [];
            const estimatedTokens = estimateComponentTokens(files);
            const tooLarge = isLikelyTooLarge(estimatedTokens);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  path: examplePath,
                  name: example.content.name,
                  files,
                  fileList: getFileTokenList(files),
                  dependencies: example.content.dependencies || [],
                  devDependencies: example.content.devDependencies || [],
                  components: example.content.components || [],
                  fileCount: files.length,
                  estimatedTokens,
                  ...(tooLarge && {
                    warning: `Response is large (${estimatedTokens} tokens). Consider fetching specific component files instead.`,
                  }),
                }, null, 2),
              }],
            };
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
        isError: true,
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
