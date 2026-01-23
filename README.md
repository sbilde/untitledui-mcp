# UntitledUI MCP

![UntitledUI MCP](assets/cover.png)

MCP server for UntitledUI components. Browse, search, and fetch React components with automatic dependency resolution.

## Install

**Claude Code:**
```bash
claude mcp add untitledui -- npx untitledui-mcp
```

**Cursor / VS Code** — add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "untitledui": {
      "command": "npx",
      "args": ["untitledui-mcp"]
    }
  }
}
```

## Authentication

```bash
npx untitledui@latest login
```

Opens browser to authenticate. Saves key to `~/.untitledui/config.json` (auto-detected by MCP).

Or set manually in MCP config:
```json
{
  "env": { "UNTITLEDUI_LICENSE_KEY": "<key>" }
}
```

Verify setup:
```bash
npx untitledui-mcp --test
```

## Usage

### Fetch component with dependencies

```
"Add the AI assistant modal"

→ get_component_with_deps { type: "application", name: "modals/ai-assistant-modal" }
→ Returns: modal + button, input, avatar base components + npm deps
```

### Fetch component only

```
"Just get me the button"

→ get_component { type: "base", name: "button" }
→ Returns: button.tsx only
```

### Browse variants

```
"What modals are available?"

→ list_components { type: "application", subfolder: "modals" }
→ Returns: ai-assistant-modal, command-modal, confirmation-modal, file-upload-modal, ...
```

### Search everything

```
"Find file upload components"

→ search_components { query: "file upload" }
→ Returns: matches from all categories with relevance scores
```

### Get complete page template

```
"Start with a dashboard"

→ get_example { name: "application" }
→ Returns: full dashboard with sidebar, header, sample pages, all deps
```

### Build marketing page

```
"Add hero and pricing sections"

→ get_component_with_deps { type: "marketing", name: "hero-sections/split-with-image" }
→ get_component_with_deps { type: "marketing", name: "pricing-sections/three-tier-cards" }
```

## Tools

| Tool | Purpose |
|------|---------|
| `search_components` | Fuzzy search across 600+ components |
| `list_components` | Browse category, optional subfolder |
| `list_component_types` | List categories |
| `get_component` | Fetch single component |
| `get_component_with_deps` | Fetch component + base dependencies |
| `list_examples` | List page templates |
| `get_example` | Fetch complete page template |
| `clear_cache` | Clear cached data |

## Components

| Category | Count | Examples |
|----------|-------|----------|
| `application` | 40+ components, 75+ variants | modals, sidebars, tables, forms, metrics |
| `marketing` | 500+ variants | hero, pricing, testimonials, FAQ, CTA, footer |
| `base` | 30 | button, input, select, avatar, badge, tooltip |
| `foundations` | 10 | icons, logos |
| `shared-assets` | 7 | illustrations, mockups, patterns |

## Response Format

**Component with deps:**
```json
{
  "primary": {
    "name": "ai-assistant-modal",
    "files": [{ "path": "ai-assistant-modal.tsx", "code": "..." }],
    "baseComponents": ["button", "input", "avatar"]
  },
  "baseComponents": [
    { "name": "button", "files": [...] },
    { "name": "input", "files": [...] }
  ],
  "allDependencies": ["@headlessui/react", "clsx"]
}
```

**Not found:**
```json
{
  "error": "Component 'datepicker' not found",
  "suggestions": ["application/date-picker", "application/date-range-picker"]
}
```

## Requirements

- Node.js 18+
- UntitledUI account (free for base, Pro for full library)

## License

MIT
