# UntitledUI MCP

![UntitledUI MCP](assets/cover.png)

MCP server that gives AI assistants access to the UntitledUI component library. Search, browse, and retrieve production-ready React components with full dependency resolution.

## Setup

### 1. Get your license key

```bash
npx untitledui@latest login
```

This opens your browser to authenticate with UntitledUI and saves your license key to `~/.untitledui/config.json`.

### 2. Add to your AI tool

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
      "args": ["untitledui-mcp"],
      "env": {
        "UNTITLEDUI_LICENSE_KEY": "<your-key>"
      }
    }
  }
}
```

> Replace `<your-key>` with the value from `~/.untitledui/config.json`, or omit the `env` field if you've already run `npx untitledui login`.

### 3. Verify

```bash
npx untitledui-mcp --test
```

```
✓ License key is valid
✓ API connection successful
✓ 5 component types available
✓ Ready to serve
```

## Tools

| Tool | Purpose |
|------|---------|
| `search_components` | Fuzzy search across all components |
| `get_component_with_deps` | Fetch component with all base dependencies |
| `get_component` | Fetch single component |
| `list_components` | Browse components by category |
| `list_component_types` | List categories (application, marketing, base, etc.) |
| `list_examples` | List page templates |
| `get_example` | Fetch complete page template |

## Usage Examples

### Search and fetch a component

```
User: "Add a command palette modal"

AI calls: search_components { query: "command palette" }
AI calls: get_component_with_deps { type: "application", name: "modals/command-modal" }
→ Returns component code + button, input, kbd base components
```

### Browse available modals

```
User: "What modal components are available?"

AI calls: list_components { type: "application", subfolder: "modals" }
→ Returns: ai-assistant-modal, command-modal, confirmation-modal, ...
```

### Get a page template

```
User: "Start with the dashboard example"

AI calls: get_example { name: "application" }
→ Returns complete dashboard with sidebar, header, metrics, tables
```

### Marketing sections

```
User: "Add a pricing section with monthly/annual toggle"

AI calls: search_components { query: "pricing toggle" }
AI calls: get_component_with_deps { type: "marketing", name: "pricing-sections/two-tier-comparison" }
→ Returns pricing component + dependencies
```

## Component Categories

| Category | Contents |
|----------|----------|
| `application` | Dashboards, modals, sidebars, tables, forms, metrics |
| `marketing` | Hero, features, pricing, testimonials, FAQ, CTA, footer |
| `base` | Button, input, select, checkbox, avatar, badge, tooltip |
| `foundations` | Icons, logos |
| `shared-assets` | Illustrations, mockups, patterns |

## Response Format

```json
{
  "primary": {
    "name": "command-modal",
    "type": "application",
    "files": [{ "name": "command-modal.tsx", "content": "..." }],
    "dependencies": ["@headlessui/react", "clsx"],
    "baseComponents": ["button", "input", "kbd"]
  },
  "baseComponents": [
    { "name": "button", "files": [...] },
    { "name": "input", "files": [...] }
  ],
  "allDependencies": ["@headlessui/react", "clsx", "@radix-ui/react-slot"]
}
```

## Pro vs Base Components

- **Base components** (button, input, etc.) are included with all licenses
- **Pro components** (modals, dashboards, marketing sections) require UntitledUI Pro

If you request a Pro component without a Pro license, you'll get:
```json
{ "error": "PRO access required for: modals/ai-assistant-modal" }
```

## Requirements

- Node.js 18+
- UntitledUI license (free or Pro)

## License

MIT
