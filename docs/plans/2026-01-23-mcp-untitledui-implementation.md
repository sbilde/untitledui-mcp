# MCP UntitledUI Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that provides AI agents with access to UntitledUI Pro components via direct API integration.

**Architecture:** TypeScript MCP server using @modelcontextprotocol/sdk that calls UntitledUI's REST API. In-memory caching with TTL. Auto-detects license from ~/.untitledui/config.json or accepts via env/CLI.

**Tech Stack:** TypeScript, Node.js, @modelcontextprotocol/sdk, node-fetch, vitest

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `.env.example`

**Step 1: Initialize package.json**

```bash
cd .worktrees/mcp-server
```

Create `package.json`:

```json
{
  "name": "mcp-untitledui",
  "version": "0.1.0",
  "description": "MCP server for UntitledUI Pro components",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mcp-untitledui": "dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node dist/index.js"
  },
  "keywords": ["mcp", "untitledui", "ui-components", "claude"],
  "author": "Steffen Bilde",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .env.example**

```
UNTITLEDUI_LICENSE_KEY=your_license_key_here
```

**Step 4: Create minimal src/index.ts**

```typescript
#!/usr/bin/env node

console.log("mcp-untitledui server starting...");
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully

**Step 6: Verify build works**

Run: `npm run build`
Expected: dist/index.js created

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize project structure with TypeScript and MCP SDK"
```

---

## Task 2: API Client Types

**Files:**
- Create: `src/api/types.ts`

**Step 1: Create API types**

Create `src/api/types.ts`:

```typescript
// UntitledUI API Response Types

export interface ComponentType {
  types: string[];
}

export interface ComponentListItem {
  name: string;
  type: "file" | "dir";
  count?: number;
}

export interface ComponentListResponse {
  components: ComponentListItem[] | ComponentListWithSubfolder[];
}

export interface ComponentListWithSubfolder {
  [subfolder: string]: ComponentListItem[];
}

export interface ComponentFile {
  path: string;
  code: string;
}

export interface FetchedComponent {
  name: string;
  files: ComponentFile[];
  dependencies?: string[];
  devDependencies?: string[];
  components?: BaseComponentRef[];
}

export interface BaseComponentRef {
  name: string;
  path: string;
}

export interface ComponentsResponse {
  components: FetchedComponent[];
  pro?: string[];
}

export interface ExampleResponse {
  type: "json-file" | "directory" | "json-files" | "error";
  content?: ExampleContent;
  results?: string[];
  status?: number;
  message?: string;
}

export interface ExampleContent {
  name: string;
  files: ComponentFile[];
  dependencies?: string[];
  devDependencies?: string[];
  components?: BaseComponentRef[];
}

// MCP Tool Response Types

export interface MCPComponentResponse {
  name: string;
  type: string;
  description: string;
  files: ComponentFile[];
  dependencies: string[];
  devDependencies: string[];
  baseComponents: string[];
}

export interface MCPSearchResult {
  name: string;
  type: string;
  fullPath: string;
  matchType: "exact" | "partial";
  score: number;
}

export interface MCPErrorResponse {
  error: string;
  code: "INVALID_LICENSE" | "NOT_FOUND" | "API_ERROR" | "NETWORK_ERROR";
  suggestions?: string[];
}
```

**Step 2: Commit**

```bash
git add src/api/types.ts
git commit -m "feat: add TypeScript types for UntitledUI API and MCP responses"
```

---

## Task 3: API Client Implementation

**Files:**
- Create: `src/api/endpoints.ts`
- Create: `src/api/client.ts`
- Create: `src/api/client.test.ts`

**Step 1: Create endpoints constants**

Create `src/api/endpoints.ts`:

```typescript
export const API_BASE = "https://www.untitledui.com/react/api";

export const ENDPOINTS = {
  validateKey: (key: string) => `${API_BASE}/validate-key?key=${key}`,
  listTypes: (key: string) => `${API_BASE}/components/list?key=${key}`,
  listComponents: (key: string, type: string) =>
    `${API_BASE}/components/list?key=${key}&type=${type}`,
  listSubfolder: (key: string, type: string, subfolders: string[]) =>
    `${API_BASE}/components/list?key=${key}&type=${type}&subfolders=${subfolders.join(",")}`,
  fetchComponents: `${API_BASE}/components`,
  fetchExample: `${API_BASE}/components/example`,
} as const;
```

**Step 2: Write failing test for API client**

Create `src/api/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UntitledUIClient } from "./client.js";

describe("UntitledUIClient", () => {
  describe("validateLicense", () => {
    it("should return true for valid license", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      });

      const result = await client.validateLicense();
      expect(result).toBe(true);
    });

    it("should return false for invalid license", async () => {
      const client = new UntitledUIClient("invalid-key");

      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
      });

      const result = await client.validateLicense();
      expect(result).toBe(false);
    });
  });

  describe("listComponentTypes", () => {
    it("should return array of types", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          types: ["application", "base", "foundations"]
        }),
      });

      const result = await client.listComponentTypes();
      expect(result).toEqual(["application", "base", "foundations"]);
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './client.js'

**Step 4: Implement API client**

Create `src/api/client.ts`:

```typescript
import { ENDPOINTS } from "./endpoints.js";
import type {
  ComponentListItem,
  ComponentListResponse,
  ComponentsResponse,
  ExampleResponse,
  FetchedComponent,
} from "./types.js";

export class UntitledUIClient {
  constructor(private licenseKey: string) {}

  async validateLicense(): Promise<boolean> {
    try {
      const response = await fetch(ENDPOINTS.validateKey(this.licenseKey));
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async listComponentTypes(): Promise<string[]> {
    const response = await fetch(ENDPOINTS.listTypes(this.licenseKey));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.types;
  }

  async listComponents(type: string, subfolder?: string): Promise<ComponentListItem[]> {
    let url: string;
    if (subfolder) {
      url = ENDPOINTS.listSubfolder(this.licenseKey, type, [subfolder]);
    } else {
      url = ENDPOINTS.listComponents(this.licenseKey, type);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ComponentListResponse = await response.json();

    // Handle subfolder response format
    if (subfolder && Array.isArray(data.components)) {
      const subfolderData = data.components[0];
      if (subfolderData && typeof subfolderData === "object" && subfolder in subfolderData) {
        return (subfolderData as Record<string, ComponentListItem[]>)[subfolder];
      }
    }

    return data.components as ComponentListItem[];
  }

  async fetchComponent(type: string, name: string): Promise<FetchedComponent | null> {
    const response = await fetch(ENDPOINTS.fetchComponents, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        components: [name],
        key: this.licenseKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ComponentsResponse = await response.json();

    if (data.pro && data.pro.length > 0) {
      throw new Error(`PRO access required for: ${data.pro.join(", ")}`);
    }

    return data.components[0] || null;
  }

  async fetchComponents(type: string, names: string[]): Promise<FetchedComponent[]> {
    const response = await fetch(ENDPOINTS.fetchComponents, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        components: names,
        key: this.licenseKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ComponentsResponse = await response.json();

    if (data.pro && data.pro.length > 0) {
      throw new Error(`PRO access required for: ${data.pro.join(", ")}`);
    }

    return data.components;
  }

  async fetchExample(name: string): Promise<ExampleResponse> {
    const response = await fetch(ENDPOINTS.fetchExample, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        example: name,
        key: this.licenseKey,
      }),
    });

    return response.json();
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/api/
git commit -m "feat: implement UntitledUI API client with tests"
```

---

## Task 4: Cache Implementation

**Files:**
- Create: `src/cache/memory-cache.ts`
- Create: `src/cache/memory-cache.test.ts`

**Step 1: Write failing test**

Create `src/cache/memory-cache.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "./memory-cache.js";

describe("MemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should store and retrieve values", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 60);
    expect(cache.get("key1")).toBe("value1");
  });

  it("should return undefined for missing keys", () => {
    const cache = new MemoryCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should expire entries after TTL", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 60); // 60 seconds TTL

    vi.advanceTimersByTime(61 * 1000); // Advance 61 seconds

    expect(cache.get("key1")).toBeUndefined();
  });

  it("should clear all entries", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 60);
    cache.set("key2", "value2", 60);

    cache.clear();

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });

  it("should clear entries matching pattern", () => {
    const cache = new MemoryCache();
    cache.set("component:button", "data1", 60);
    cache.set("component:input", "data2", 60);
    cache.set("search:button", "data3", 60);

    const cleared = cache.clearPattern("component:");

    expect(cleared).toBe(2);
    expect(cache.get("component:button")).toBeUndefined();
    expect(cache.get("search:button")).toBe("data3");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './memory-cache.js'

**Step 3: Implement cache**

Create `src/cache/memory-cache.ts`:

```typescript
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  clearPattern(pattern: string): number {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  size(): number {
    // Clean expired entries first
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  componentTypes: 3600,     // 1 hour
  componentList: 3600,      // 1 hour
  componentCode: 86400,     // 24 hours
  searchResults: 1800,      // 30 minutes
  examples: 86400,          // 24 hours
  licenseValidation: 300,   // 5 minutes
} as const;
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cache/
git commit -m "feat: implement in-memory cache with TTL support"
```

---

## Task 5: License Key Resolution

**Files:**
- Create: `src/utils/license.ts`
- Create: `src/utils/license.test.ts`

**Step 1: Write failing test**

Create `src/utils/license.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveLicenseKey } from "./license.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("fs");
vi.mock("os");

describe("resolveLicenseKey", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.UNTITLEDUI_LICENSE_KEY;
  });

  it("should prefer CLI argument over env var", () => {
    process.env.UNTITLEDUI_LICENSE_KEY = "env-key";
    const result = resolveLicenseKey("cli-key");
    expect(result).toBe("cli-key");
  });

  it("should use env var if no CLI argument", () => {
    process.env.UNTITLEDUI_LICENSE_KEY = "env-key";
    const result = resolveLicenseKey();
    expect(result).toBe("env-key");
  });

  it("should read from config file if no env var", () => {
    vi.mocked(os.homedir).mockReturnValue("/home/user");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ license: "file-key" })
    );

    const result = resolveLicenseKey();
    expect(result).toBe("file-key");
  });

  it("should return undefined if no key found", () => {
    vi.mocked(os.homedir).mockReturnValue("/home/user");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = resolveLicenseKey();
    expect(result).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './license.js'

**Step 3: Implement license resolution**

Create `src/utils/license.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".untitledui", "config.json");

export function resolveLicenseKey(cliArg?: string): string | undefined {
  // Priority 1: CLI argument
  if (cliArg) {
    return cliArg;
  }

  // Priority 2: Environment variable
  const envKey = process.env.UNTITLEDUI_LICENSE_KEY;
  if (envKey) {
    return envKey;
  }

  // Priority 3: Config file (~/.untitledui/config.json)
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      if (config.license) {
        return config.license;
      }
    }
  } catch {
    // Ignore file read errors
  }

  return undefined;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: implement license key resolution (CLI > env > config file)"
```

---

## Task 6: Search Utility

**Files:**
- Create: `src/utils/search.ts`
- Create: `src/utils/search.test.ts`

**Step 1: Write failing test**

Create `src/utils/search.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { fuzzySearch, type SearchableItem } from "./search.js";

describe("fuzzySearch", () => {
  const items: SearchableItem[] = [
    { name: "button", type: "base", fullPath: "base/button" },
    { name: "date-picker", type: "application", fullPath: "application/date-picker" },
    { name: "date-range-picker", type: "application", fullPath: "application/date-range-picker" },
    { name: "ai-assistant-modal", type: "application", fullPath: "application/modals/ai-assistant-modal" },
  ];

  it("should find exact matches", () => {
    const results = fuzzySearch("button", items);
    expect(results[0].name).toBe("button");
    expect(results[0].matchType).toBe("exact");
  });

  it("should find partial matches", () => {
    const results = fuzzySearch("date", items);
    expect(results.length).toBe(2);
    expect(results.every(r => r.name.includes("date"))).toBe(true);
  });

  it("should rank exact matches higher", () => {
    const results = fuzzySearch("date-picker", items);
    expect(results[0].name).toBe("date-picker");
    expect(results[0].matchType).toBe("exact");
  });

  it("should return empty array for no matches", () => {
    const results = fuzzySearch("nonexistent", items);
    expect(results).toEqual([]);
  });

  it("should limit results", () => {
    const results = fuzzySearch("a", items, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './search.js'

**Step 3: Implement search**

Create `src/utils/search.ts`:

```typescript
export interface SearchableItem {
  name: string;
  type: string;
  fullPath: string;
}

export interface SearchResult extends SearchableItem {
  matchType: "exact" | "partial";
  score: number;
}

export function fuzzySearch(
  query: string,
  items: SearchableItem[],
  limit = 20
): SearchResult[] {
  const queryLower = query.toLowerCase();

  const results: SearchResult[] = [];

  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const fullPathLower = item.fullPath.toLowerCase();

    let score = 0;
    let matchType: "exact" | "partial" = "partial";

    // Exact match on name
    if (nameLower === queryLower) {
      score = 1.0;
      matchType = "exact";
    }
    // Name starts with query
    else if (nameLower.startsWith(queryLower)) {
      score = 0.9;
    }
    // Name contains query
    else if (nameLower.includes(queryLower)) {
      score = 0.7;
    }
    // Full path contains query
    else if (fullPathLower.includes(queryLower)) {
      score = 0.5;
    }
    // Fuzzy: all query chars appear in order
    else {
      let queryIndex = 0;
      for (const char of nameLower) {
        if (char === queryLower[queryIndex]) {
          queryIndex++;
        }
        if (queryIndex === queryLower.length) {
          score = 0.3;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({
        ...item,
        matchType,
        score,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/search.ts src/utils/search.test.ts
git commit -m "feat: implement fuzzy search for components"
```

---

## Task 7: Component Descriptions

**Files:**
- Create: `src/utils/descriptions.ts`

**Step 1: Create descriptions utility**

Create `src/utils/descriptions.ts`:

```typescript
// Generated descriptions based on component name and type
// Since UntitledUI API doesn't provide descriptions, we generate them

const TYPE_DESCRIPTIONS: Record<string, string> = {
  application: "Application UI component for dashboards and web apps",
  base: "Core UI primitive component",
  foundations: "Foundational element (icon, logo, visual)",
  marketing: "Marketing section component for landing pages",
  "shared-assets": "Shared visual asset (illustration, pattern, mockup)",
  icons: "Icon component",
};

const NAME_PATTERNS: [RegExp, string][] = [
  [/modal/i, "Modal dialog component"],
  [/button/i, "Interactive button component"],
  [/input/i, "Form input component"],
  [/select/i, "Selection/dropdown component"],
  [/table/i, "Data table component"],
  [/calendar/i, "Calendar/date component"],
  [/date-picker/i, "Date selection component"],
  [/sidebar/i, "Sidebar navigation component"],
  [/header/i, "Header/navigation component"],
  [/footer/i, "Footer section component"],
  [/card/i, "Card container component"],
  [/avatar/i, "User avatar component"],
  [/badge/i, "Badge/label component"],
  [/alert/i, "Alert/notification component"],
  [/toast/i, "Toast notification component"],
  [/dropdown/i, "Dropdown menu component"],
  [/tabs/i, "Tabbed interface component"],
  [/pagination/i, "Pagination component"],
  [/carousel/i, "Carousel/slider component"],
  [/chart/i, "Chart/visualization component"],
  [/metric/i, "Metrics/statistics component"],
  [/form/i, "Form component"],
  [/pricing/i, "Pricing section component"],
  [/testimonial/i, "Testimonial section component"],
  [/feature/i, "Features section component"],
  [/cta/i, "Call-to-action section component"],
  [/hero/i, "Hero section component"],
  [/faq/i, "FAQ section component"],
  [/blog/i, "Blog section component"],
  [/team/i, "Team section component"],
  [/contact/i, "Contact section component"],
  [/login/i, "Login/authentication component"],
  [/signup/i, "Signup/registration component"],
];

export function generateDescription(name: string, type: string): string {
  // Check name patterns first
  for (const [pattern, description] of NAME_PATTERNS) {
    if (pattern.test(name)) {
      return description;
    }
  }

  // Fall back to type description
  const typeDesc = TYPE_DESCRIPTIONS[type];
  if (typeDesc) {
    return `${typeDesc}: ${name.replace(/-/g, " ")}`;
  }

  // Generic fallback
  return `UI component: ${name.replace(/-/g, " ")}`;
}
```

**Step 2: Commit**

```bash
git add src/utils/descriptions.ts
git commit -m "feat: add component description generator"
```

---

## Task 8: MCP Server Core

**Files:**
- Create: `src/server.ts`

**Step 1: Implement MCP server**

Create `src/server.ts`:

```typescript
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
      name: "mcp-untitledui",
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
```

**Step 2: Commit**

```bash
git add src/server.ts
git commit -m "feat: implement MCP server with all tools"
```

---

## Task 9: CLI Entry Point

**Files:**
- Modify: `src/index.ts`

**Step 1: Implement CLI**

Replace `src/index.ts` with:

```typescript
#!/usr/bin/env node

import { resolveLicenseKey } from "./utils/license.js";
import { runServer } from "./server.js";
import { UntitledUIClient } from "./api/client.js";

async function main() {
  const args = process.argv.slice(2);

  // Parse CLI arguments
  let cliLicenseKey: string | undefined;
  let testMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--license-key" && args[i + 1]) {
      cliLicenseKey = args[i + 1];
      i++;
    } else if (args[i] === "--test") {
      testMode = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
mcp-untitledui - MCP server for UntitledUI Pro components

Usage:
  mcp-untitledui [options]

Options:
  --license-key <key>  Specify license key (overrides env/config)
  --test               Test connection and exit
  --help, -h           Show this help message

Environment:
  UNTITLEDUI_LICENSE_KEY  License key (if not using --license-key)

Config:
  ~/.untitledui/config.json  Auto-detected from UntitledUI CLI login
`);
      process.exit(0);
    }
  }

  // Resolve license key
  const licenseKey = resolveLicenseKey(cliLicenseKey);

  if (!licenseKey) {
    console.error("Error: No license key found.");
    console.error("");
    console.error("Please provide a license key via one of:");
    console.error("  1. CLI argument: --license-key <key>");
    console.error("  2. Environment: UNTITLEDUI_LICENSE_KEY=<key>");
    console.error("  3. Login via CLI: npx untitledui login");
    process.exit(1);
  }

  // Test mode
  if (testMode) {
    console.log("Testing connection...");
    const client = new UntitledUIClient(licenseKey);

    const valid = await client.validateLicense();
    if (!valid) {
      console.error("✗ License key is invalid");
      process.exit(1);
    }
    console.log("✓ License key is valid");

    try {
      const types = await client.listComponentTypes();
      console.log(`✓ API connection successful`);
      console.log(`✓ ${types.length} component types available`);
      console.log("✓ Ready to serve");
      process.exit(0);
    } catch (error) {
      console.error("✗ API connection failed:", error);
      process.exit(1);
    }
  }

  // Run server
  await runServer(licenseKey);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Step 2: Build and test**

Run: `npm run build`
Expected: Build succeeds

Run: `node dist/index.js --help`
Expected: Shows help message

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement CLI entry point with argument parsing"
```

---

## Task 10: Final Build & Test

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Build production bundle**

Run: `npm run build`
Expected: dist/index.js created

**Step 3: Test with real license key**

Run: `node dist/index.js --test`
Expected:
```
Testing connection...
✓ License key is valid
✓ API connection successful
✓ 6 component types available
✓ Ready to serve
```

**Step 4: Create README.md**

Create `README.md`:

```markdown
# mcp-untitledui

MCP server for UntitledUI Pro components. Provides AI agents with access to browse, search, and retrieve UI components.

## Installation

```bash
npm install -g mcp-untitledui
```

Or use directly via npx:

```bash
npx mcp-untitledui
```

## Configuration

### Option 1: Auto-detect (Recommended)

If you've already logged in via UntitledUI CLI:

```bash
npx untitledui login
```

The MCP server will automatically use your saved license key.

### Option 2: Environment Variable

```bash
export UNTITLEDUI_LICENSE_KEY=your_key_here
npx mcp-untitledui
```

### Option 3: CLI Argument

```bash
npx mcp-untitledui --license-key your_key_here
```

## Claude Code Integration

```bash
# Add to Claude Code
claude mcp add untitledui npx mcp-untitledui

# Or with explicit key
claude mcp add untitledui npx mcp-untitledui --license-key YOUR_KEY
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_component_types` | List all component categories |
| `list_components` | List components in a category |
| `search_components` | Search components by name |
| `get_component` | Get single component code |
| `get_component_with_deps` | Get component with all dependencies |
| `list_examples` | List page examples |
| `get_example` | Get complete page example |
| `validate_license` | Verify license key |
| `clear_cache` | Clear cached data |

## Testing

```bash
npx mcp-untitledui --test
```

## License

MIT
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete MCP server implementation

- Full tool suite for browsing, searching, and fetching components
- In-memory caching with TTL
- Auto-detect license from ~/.untitledui/config.json
- CLI with --test mode for verification
- Comprehensive README"
```

---

## Summary

After completing all tasks, you will have:

1. **Project setup** with TypeScript, MCP SDK, and build tooling
2. **API client** for UntitledUI with full type safety
3. **Memory cache** with TTL-based expiry
4. **License resolution** (CLI > env > config file)
5. **Fuzzy search** for component discovery
6. **MCP server** with 9 tools
7. **CLI entry point** with --test mode
8. **Documentation** for users

Total: ~10 tasks, ~50 steps
