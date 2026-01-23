# UntitledUI MCP

![UntitledUI MCP](assets/cover.png)

MCP server that gives AI assistants direct access to the UntitledUI component library. Browse, search, and retrieve React components with automatic dependency resolution.

## What You Get

- **500+ marketing sections** — Hero, pricing, testimonials, FAQ, CTA, features, footers
- **40+ application components** — Modals, sidebars, tables, forms, metrics, charts
- **75+ component variants** — Multiple versions of modals, slideouts, headers
- **30 base primitives** — Button, input, select, avatar, badge, tooltip
- **Complete page templates** — Full dashboard and marketing page examples
- **Automatic dependency resolution** — Request a modal, get all required base components

## Setup

### 1. Get your license key

```bash
npx untitledui@latest login
```

Opens your browser to authenticate. Saves license key to `~/.untitledui/config.json`.

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

> Omit the `env` field if you've run `npx untitledui@latest login` — the key is auto-detected.

### 3. Verify

```bash
npx untitledui-mcp --test
```

## Tools

### Discovery

| Tool | Purpose |
|------|---------|
| `search_components` | Fuzzy search across all 600+ components |
| `list_component_types` | List categories: application, marketing, base, foundations, shared-assets |
| `list_components` | Browse components in a category, with optional subfolder drilling |
| `list_examples` | List available page templates |

### Fetching

| Tool | Purpose |
|------|---------|
| `get_component` | Fetch single component only (no dependencies) |
| `get_component_with_deps` | Fetch component + all base dependencies (recommended) |
| `get_example` | Fetch complete page template with all files |

### Utility

| Tool | Purpose |
|------|---------|
| `validate_license` | Check license key status |
| `clear_cache` | Clear cached data (with optional pattern) |

## Usage Examples

### Get a specific component with dependencies

```
User: "Add the AI assistant modal"

AI calls: get_component_with_deps { type: "application", name: "modals/ai-assistant-modal" }

→ Returns:
  - ai-assistant-modal.tsx (primary component)
  - button.tsx, input.tsx, avatar.tsx (base dependencies)
  - All npm dependencies: @headlessui/react, clsx, etc.
```

### Browse component variants

```
User: "What modal options are there?"

AI calls: list_components { type: "application", subfolder: "modals" }

→ Returns 20+ variants:
  - ai-assistant-modal
  - command-modal
  - confirmation-modal
  - cookie-settings-modal
  - file-upload-modal
  - ...
```

### Search across everything

```
User: "Find components for file uploads"

AI calls: search_components { query: "file upload" }

→ Returns matches from all categories:
  - application/modals/file-upload-modal
  - application/file-upload-states
  - marketing/file-upload-sections/...
```

### Start with a complete template

```
User: "I need a dashboard starting point"

AI calls: get_example { name: "application" }

→ Returns complete dashboard:
  - Layout with sidebar + header
  - Sample pages
  - All required components
  - npm dependencies
```

### Build a marketing page

```
User: "Add hero, features, and pricing sections"

AI calls: search_components { query: "hero" }
AI calls: get_component_with_deps { type: "marketing", name: "hero-sections/split-with-image" }
AI calls: get_component_with_deps { type: "marketing", name: "feature-sections/three-column-cards" }
AI calls: get_component_with_deps { type: "marketing", name: "pricing-sections/three-tier-cards" }

→ Returns each section with all dependencies
```

### Explicit fetch without dependencies

```
User: "Just get me the button component, I'll handle the rest"

AI calls: get_component { type: "base", name: "button" }

→ Returns only button.tsx
→ Lists baseComponents but doesn't fetch them
```

## Component Categories

| Category | Count | Contents |
|----------|-------|----------|
| `application` | 40+ components, 75+ variants | Modals, sidebars, slideouts, tables, forms, metrics, charts, headers |
| `marketing` | 23 categories, 500+ variants | Hero, features, pricing, testimonials, FAQ, CTA, blog, team, contact, footer |
| `base` | 30 components | Button, input, select, checkbox, radio, avatar, badge, tooltip, dropdown |
| `foundations` | 10 | Icons, logos, color primitives |
| `shared-assets` | 7 | Illustrations, mockups, patterns, decorative elements |

## Response Format

### Single component (`get_component`)

```json
{
  "name": "button",
  "type": "base",
  "files": [{ "path": "button.tsx", "code": "..." }],
  "dependencies": ["@radix-ui/react-slot", "clsx"],
  "baseComponents": []
}
```

### Component with dependencies (`get_component_with_deps`)

```json
{
  "primary": {
    "name": "ai-assistant-modal",
    "type": "application",
    "files": [{ "path": "ai-assistant-modal.tsx", "code": "..." }],
    "baseComponents": ["button", "input", "avatar"]
  },
  "baseComponents": [
    { "name": "button", "files": [...] },
    { "name": "input", "files": [...] },
    { "name": "avatar", "files": [...] }
  ],
  "allDependencies": ["@headlessui/react", "@radix-ui/react-slot", "clsx"],
  "totalFiles": 4
}
```

### Search results

```json
{
  "query": "date picker",
  "results": [
    { "name": "date-picker", "type": "application", "fullPath": "application/date-picker", "score": 1.0 },
    { "name": "date-range-picker", "type": "application", "fullPath": "application/date-range-picker", "score": 0.9 }
  ]
}
```

### Not found (with suggestions)

```json
{
  "error": "Component 'datepicker' not found",
  "code": "NOT_FOUND",
  "suggestions": [
    "application/date-picker",
    "application/date-range-picker"
  ]
}
```

## Caching

Components are cached for the session:
- Component lists: 1 hour
- Component code: 24 hours
- Search index: 30 minutes

Clear cache manually:

```
AI calls: clear_cache { }                    → Clears everything
AI calls: clear_cache { pattern: "component:" }  → Clears only component cache
```

## Pro vs Base

- **Base components** work with any UntitledUI license
- **Pro components** (application, marketing) require UntitledUI Pro

Without Pro access:
```json
{ "error": "PRO access required for: modals/ai-assistant-modal" }
```

## Requirements

- Node.js 18+
- UntitledUI account (free for base, Pro for full library)

## License

MIT
