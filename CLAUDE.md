# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build      # Build with tsup (outputs to dist/)
npm run dev        # Watch mode
npm test           # Run all tests with vitest
npm run test:watch # Watch mode for tests
npm start          # Run the built server

# Test connection
npx untitledui-mcp --test
```

## Architecture

This is an MCP (Model Context Protocol) server that proxies the UntitledUI API, allowing AI agents to fetch real UI components.

### Core Flow

```
AI Agent → MCP Tools → UntitledUIClient → UntitledUI API
                ↓
           MemoryCache (TTL-based)
```

### Key Files

- `src/index.ts` - CLI entry point with argument parsing and test mode
- `src/server.ts` - MCP server setup and tool handlers (list_components, get_component, search_components, etc.)
- `src/api/client.ts` - HTTP client for UntitledUI API
- `src/api/endpoints.ts` - API URL builders
- `src/utils/parse-deps.ts` - Parses `@/components/base/*` imports from component code to resolve dependencies
- `src/utils/tokens.ts` - Token estimation for response size warnings (25K limit)
- `src/cache/memory-cache.ts` - In-memory cache with TTL

### MCP Tools

The server exposes these tools to AI agents:
- `list_component_types` / `list_components` / `search_components` - Discovery
- `get_component` / `get_component_with_deps` - Fetch component code
- `get_component_file` - Fetch single file (hybrid fallback for large responses)
- `list_examples` / `get_example` - Browse/fetch page templates

### Dependency Resolution

UntitledUI components import base components via `@/components/base/*`. The API doesn't return these dependencies, so `parse-deps.ts` extracts them from code and `get_component_with_deps` fetches them automatically.

### Token Limits

Responses include `estimatedTokens`. If >25000, a warning is added suggesting `get_component_file` for individual files instead.

## License Key Resolution

Priority: CLI arg → env `UNTITLEDUI_LICENSE_KEY` → `~/.untitledui/config.json`
