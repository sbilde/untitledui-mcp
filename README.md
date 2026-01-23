# UntitledUI MCP

![UntitledUI MCP](assets/cover.png)

MCP server that lets AI agents fetch real UntitledUI components instead of generating UI from scratch.

## Why

AI tools can generate functional UI, but the result often lacks the polish and consistency of professionally designed systems. UntitledUI is one of the most refined component libraries available — this MCP gives your AI direct access to it.

Instead of generating a modal from patterns it's seen, your AI fetches the actual UntitledUI modal with all its carefully crafted details intact.

## Setup

### Add MCP to your tool

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

This gives you access to **base components** (button, input, select, avatar, badge, etc.) without authentication.

### For Pro components (optional)

To access application components (modals, sidebars, tables, dashboards) and marketing sections, authenticate with your UntitledUI Pro license:

```bash
npx untitledui@latest login
```

This opens your browser to authenticate and saves your license key to `~/.untitledui/config.json`. The MCP auto-detects this file.

Alternatively, set the key manually in your MCP config:
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

### Verify setup

```bash
npx untitledui-mcp --test
```

## How It Works

Your AI gets these tools:

| Tool | What it does |
|------|--------------|
| `search_components` | Find components by name or description |
| `list_components` | Browse a category |
| `get_component_with_deps` | Fetch component + all dependencies |
| `get_component` | Fetch component only |
| `get_example` | Get complete page template |

### Example: Add a modal

```
You: "Add a settings modal"

AI searches → finds application/modals/settings-modal
AI fetches → gets modal + button, input, select base components
AI adds → places files in your project with correct imports
```

### Example: Browse options

```
You: "What sidebar variants are there?"

AI calls list_components { type: "application", subfolder: "sidebars" }
→ Returns all sidebar options for you to choose from
```

### Example: Start from template

```
You: "Set up a dashboard layout"

AI calls get_example { name: "application" }
→ Returns complete dashboard with sidebar, header, and sample pages
```

## Response Format

```json
{
  "primary": {
    "name": "settings-modal",
    "files": [{ "path": "settings-modal.tsx", "code": "..." }],
    "baseComponents": ["button", "input", "select"]
  },
  "baseComponents": [
    { "name": "button", "files": [...] },
    { "name": "input", "files": [...] }
  ],
  "allDependencies": ["@headlessui/react", "clsx"]
}
```

## Requirements

- Node.js 18+
- UntitledUI Pro license (only for Pro components)

## Credits

[UntitledUI](https://www.untitledui.com) is created by [Jordan Hughes](https://jordanhughes.co).

- [Twitter/X](https://x.com/jordanphughes)
- [Dribbble](https://dribbble.com/jordanhughes)
- [UntitledUI on X](https://x.com/UntitledUI)

## License

MIT
