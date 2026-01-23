# MCP Server Design: mcp-untitledui

**Date:** 2026-01-23
**Status:** Approved
**Author:** Steffen Bilde + Claude

## Overview

This document describes the design for an MCP (Model Context Protocol) server that provides AI agents with access to UntitledUI Pro components. The server enables Claude Code and other MCP-compatible AI tools to browse, search, and retrieve UI components directly from UntitledUI's API.

### Problem Statement

UntitledUI Pro is a comprehensive UI kit with React components, but the only access methods are:
1. Manual download from the website
2. Interactive CLI tool (`npx untitledui`)

Neither approach is AI-native. This MCP server bridges that gap, making UntitledUI components available to AI agents at runtime.

### Inspiration

This project is inspired by [mcp-tailwindplus](https://github.com/richardkmichael/mcp-tailwindplus), which provides similar functionality for TailwindUI components.

## Architecture Decision

### Chosen Approach: Direct API Access (TypeScript)

**Alternatives Considered:**

| Approach | Pros | Cons |
|----------|------|------|
| A) Python + FastMCP | Same as TailwindPlus, mature | Requires Python environment |
| B) TypeScript + Direct API | Same stack as UntitledUI CLI, npm distribution | Requires network |
| C) Download + Serve | Works offline | Complex, stale data |

**Decision:** Approach B (TypeScript + Direct API)

**Rationale:**
1. Users working with UntitledUI already have Node.js
2. Simpler distribution via npm/npx
3. Real-time access to latest components
4. Single codebase to maintain
5. Can leverage patterns from UntitledUI's own CLI

## UntitledUI API

### Authentication

License key stored in `~/.untitledui/config.json`:
```json
{
  "license": "a8ca350939b5367f4bbc715edcb8768b"
}
```

### Discovered Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/react/api/validate-key?key=X` | GET | Validate license key |
| `/react/api/components/list?key=X` | GET | List all component types |
| `/react/api/components/list?key=X&type=Y` | GET | List components by type |
| `/react/api/components/list?key=X&type=Y&subfolders=Z` | GET | List variants in subfolder |
| `/react/api/components` | POST | Fetch component code |
| `/react/api/components/example` | POST | Fetch page examples |

### Component Types Available

- `application` - Dashboard components (41 + 75 variants)
- `base` - Core UI components (30)
- `foundations` - Icons and primitives (10)
- `marketing` - Marketing sections (23 categories, ~500+ variants)
- `shared-assets` - Illustrations, patterns (7)
- `icons` - Icon library

## MCP Tools Design

### Tool Categories

The server follows a **configurable mode** philosophy:
- **Info tools**: Browse and search (no side effects)
- **Explicit tools**: Fetch only what's requested
- **Smart tools**: Fetch with dependencies automatically

### Complete Tool List

| Tool | Category | Purpose | Cache TTL |
|------|----------|---------|-----------|
| `list_component_types` | Info | List all categories | 1 hour |
| `list_components` | Info | List components in category | 1 hour |
| `search_components` | Info | Fuzzy search across all | 30 min |
| `get_component` | Explicit | Fetch single component only | 24 hours |
| `get_example` | Explicit | Fetch single page example | 24 hours |
| `get_component_with_deps` | Smart | Fetch component + all dependencies | 24 hours |
| `scaffold_project` | Smart | Complete project setup with shell | 24 hours |
| `list_examples` | Info | List available page examples | 1 hour |
| `validate_license` | Utility | Verify license key validity | 5 min |
| `clear_cache` | Utility | Clear cached data | - |

### Tool Specifications

#### `list_component_types`
```typescript
// Input: none
// Output:
{
  types: ["application", "base", "foundations", "icons", "marketing", "shared-assets"]
}
```

#### `list_components`
```typescript
// Input:
{
  type: string;           // Required: "application", "base", etc.
  subfolder?: string;     // Optional: "modals", "slideout-menus", etc.
}

// Output:
{
  type: string;
  components: {
    name: string;
    kind: "file" | "directory";
    variantCount?: number;
  }[];
}
```

#### `search_components`
```typescript
// Input:
{
  query: string;          // Search term
}

// Output:
{
  results: {
    name: string;
    type: string;
    fullPath: string;     // "application/modals/ai-assistant-modal"
    matchType: "exact" | "partial";
    score: number;
  }[];
}
```

#### `get_component`
```typescript
// Input:
{
  type: string;           // "application", "base", etc.
  name: string;           // "button", "modals/ai-assistant-modal"
}

// Output:
{
  name: string;
  type: string;
  description: string;
  files: {
    path: string;
    code: string;
  }[];
  dependencies: string[];
  devDependencies: string[];
  baseComponents: string[];  // Info only, not fetched
}
```

#### `get_component_with_deps`
```typescript
// Input:
{
  type: string;
  name: string;
}

// Output:
{
  primary: ComponentResponse;      // The requested component
  baseComponents: ComponentResponse[];  // All required base components
  totalFiles: number;
  allDependencies: string[];       // Deduplicated
  allDevDependencies: string[];    // Deduplicated
}
```

#### `scaffold_project`
```typescript
// Input:
{
  template: "dashboard" | "marketing" | "minimal";
  components?: string[];           // Additional components to include
  includeExamplePage?: boolean;    // Default: true
}

// Output:
{
  shell: ComponentResponse;        // Sidebar, header, layout
  components: ComponentResponse[];
  examplePage?: ExampleResponse;
  setupInstructions: string;
}
```

#### `list_examples`
```typescript
// Input: none
// Output:
{
  examples: {
    name: string;
    type: "application" | "marketing";
    description: string;
  }[];
}
```

#### `get_example`
```typescript
// Input:
{
  name: string;           // "dashboard-01", "marketing-landing"
}

// Output:
{
  name: string;
  files: { path: string; code: string }[];
  dependencies: string[];
  devDependencies: string[];
  requiredComponents: string[];
}
```

### Error Handling

```typescript
interface ErrorResponse {
  error: string;
  code: "INVALID_LICENSE" | "NOT_FOUND" | "API_ERROR" | "NETWORK_ERROR";
  suggestions?: string[];  // Similar components if NOT_FOUND
}
```

When a component is not found, the server performs fuzzy search and returns up to 5 suggestions.

## Data Models

### ComponentResponse
```typescript
interface ComponentResponse {
  name: string;
  type: string;
  description: string;
  files: {
    path: string;
    code: string;
  }[];
  dependencies: string[];
  devDependencies: string[];
  baseComponents: string[];
}
```

### ExampleResponse
```typescript
interface ExampleResponse {
  name: string;
  type: string;
  files: {
    path: string;
    code: string;
  }[];
  dependencies: string[];
  devDependencies: string[];
  requiredComponents: string[];
}
```

### SearchResult
```typescript
interface SearchResult {
  name: string;
  type: string;
  fullPath: string;
  matchType: "exact" | "partial";
  score: number;
}
```

## Project Structure

```
mcp-untitledui/
├── src/
│   ├── index.ts                 # Entry point + CLI argument parsing
│   ├── server.ts                # MCP server setup with all tools
│   ├── api/
│   │   ├── client.ts            # UntitledUI API client
│   │   ├── types.ts             # API response types
│   │   └── endpoints.ts         # API endpoint definitions
│   ├── tools/
│   │   ├── list-component-types.ts
│   │   ├── list-components.ts
│   │   ├── search-components.ts
│   │   ├── get-component.ts
│   │   ├── get-component-with-deps.ts
│   │   ├── list-examples.ts
│   │   ├── get-example.ts
│   │   ├── scaffold-project.ts
│   │   ├── validate-license.ts
│   │   └── clear-cache.ts
│   ├── cache/
│   │   └── memory-cache.ts      # In-memory cache with TTL
│   └── utils/
│       ├── descriptions.ts      # Generated component descriptions
│       └── search.ts            # Fuzzy search logic
├── package.json
├── tsconfig.json
├── README.md
└── .env.example                 # LICENSE_KEY placeholder
```

## Caching Strategy

### Cache Architecture

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL = {
  componentTypes: 3600,    // 1 hour
  componentList: 3600,     // 1 hour
  componentCode: 86400,    // 24 hours
  searchResults: 1800,     // 30 minutes
  examples: 86400,         // 24 hours
  licenseValidation: 300,  // 5 minutes
};
```

### Cache Key Format

```
list:types                                    → all types
list:application                              → components in application
list:application:modals                       → modal variants
component:base:button                         → button component code
component:application:modals/ai-assistant-modal
search:date-picker                            → search results
example:dashboard-01                          → page example
```

### Cache Behavior

1. **TTL-based expiry**: Each entry type has its own TTL
2. **Fallback on error**: If API fails, return cached data (if available)
3. **Manual clear**: `clear_cache` tool with optional pattern matching
4. **Session-scoped**: Cache lives for the duration of the MCP session

## Configuration

### License Key Resolution (Priority Order)

1. CLI argument: `--license-key <key>`
2. Environment variable: `UNTITLEDUI_LICENSE_KEY`
3. Auto-detect: `~/.untitledui/config.json`

### Installation & Usage

```bash
# Global installation
npm install -g mcp-untitledui

# Or via npx (no installation required)
npx mcp-untitledui

# Test installation
npx mcp-untitledui --test
```

### Claude Code Integration

```bash
# Personal scope (auto-detect license)
claude mcp add untitledui npx mcp-untitledui

# With explicit license key
claude mcp add untitledui npx mcp-untitledui --license-key YOUR_KEY

# Project scope (shared via .mcp.json)
claude mcp add -s project untitledui npx mcp-untitledui
```

### .mcp.json Configuration

```json
{
  "mcpServers": {
    "untitledui": {
      "command": "npx",
      "args": ["mcp-untitledui"],
      "env": {
        "UNTITLEDUI_LICENSE_KEY": "${UNTITLEDUI_LICENSE_KEY}"
      }
    }
  }
}
```

## Example Workflow

### Scenario: "Build a dashboard with date-picker and metrics"

```
USER: "I need a date-picker and metrics components for my dashboard"

CLAUDE: [Calls search_components({query: "date-picker"})]
        [Calls search_components({query: "metrics"})]

→ Returns:
  - application/date-picker
  - application/date-range-picker
  - application/metrics
  - marketing/metrics (16 variants)

CLAUDE: "I found several options. For a dashboard I recommend:
         - application/date-range-picker (for period selection)
         - application/metrics (for KPI display)
         Should I fetch these?"

USER: "Yes, get them with all dependencies"

CLAUDE: [Calls get_component_with_deps({type: "application", name: "date-range-picker"})]
        [Calls get_component_with_deps({type: "application", name: "metrics"})]

→ Returns:
  - Primary components with all files
  - Base components: button, calendar, input, badge, etc.
  - All dependencies deduplicated

CLAUDE: "I have all components ready. Should I:
         A) Copy files to your project
         B) Show you the code first
         C) Install dependencies"
```

## Dependencies

### Runtime Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "node-fetch": "^3.x"
}
```

### Dev Dependencies
```json
{
  "typescript": "^5.x",
  "tsup": "^8.x",
  "@types/node": "^20.x"
}
```

## Future Considerations

1. **Persistent cache**: Option to cache to disk for faster startup
2. **Component previews**: If UntitledUI adds preview images to API
3. **Version pinning**: Support for specific UntitledUI versions
4. **Offline mode**: Full component download for offline access
5. **Component updates**: Notification when cached components are outdated

## References

- [UntitledUI React Docs](https://www.untitledui.com/react/docs)
- [UntitledUI CLI](https://www.untitledui.com/react/docs/cli)
- [MCP Specification](https://modelcontextprotocol.io/)
- [mcp-tailwindplus (inspiration)](https://github.com/richardkmichael/mcp-tailwindplus)
- [tailwindplus-downloader](https://github.com/richardkmichael/tailwindplus-downloader)
