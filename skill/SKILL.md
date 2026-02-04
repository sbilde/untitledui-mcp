# UntitledUI Component Library Integration

Use this skill when building UIs with professionally designed components instead of generating UI from scratch. UntitledUI provides production-ready React components with proper design tokens, accessibility, and theming.

## When to Use This Skill

Trigger this skill when:

- User asks to "add a [component type]" (modal, sidebar, dropdown, etc.)
- User pastes a screenshot and asks to recreate the UI
- User requests a complete page (dashboard, settings, pricing page, etc.)
- User mentions "UntitledUI" or specific component names
- Building any UI that would benefit from professional design system components
- User needs consistent, accessible UI components quickly

## Prerequisites & Setup

### First Time Setup

**CRITICAL: Always start with an official UntitledUI starter kit.** Do not try to add components to existing projects without proper Tailwind configuration.

For Next.js projects:

```bash
git clone https://github.com/untitleduico/untitledui-nextjs-starter-kit my-app
cd my-app && npm install
```

For Vite projects:

```bash
git clone https://github.com/untitleduico/untitledui-vite-starter-kit my-app
cd my-app && npm install
```

These starter kits include:

- Tailwind CSS with all UntitledUI design tokens
- Theme provider for light/dark mode
- Toast notifications system
- Routing setup
- All required dependencies

### MCP Server Configuration

The UntitledUI MCP server should already be configured. If not present, Roy can add it:

**Claude Code:**

```bash
claude mcp add untitledui -- npx untitledui-mcp
```

**Cursor/VS Code** (`.cursor/mcp.json`):

```json
{
 "mcpServers": {
  "untitledui": {
   "command": "npx",
   "args": ["-y", "untitledui-mcp"]
  }
 }
}
```

### Authentication (For Pro Components)

Base components (button, input, select, avatar, badge) work without authentication.

For Pro components (modals, sidebars, tables, dashboards, marketing sections):

```bash
npx untitledui@latest login
```

Or set license key manually:

```json
{
 "mcpServers": {
  "untitledui": {
   "command": "npx",
   "args": ["-y", "untitledui-mcp"],
   "env": {
    "UNTITLEDUI_LICENSE_KEY": "<license-key>"
   }
  }
 }
}
```

Verify setup:

```bash
npx untitledui-mcp --test
```

## Available MCP Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `search_components` | Find components by name/description | User describes what they need |
| `list_components` | Browse a category | Exploring available options |
| `get_component_with_deps` | Fetch component + dependencies | **PRIMARY TOOL** - use for Pro components |
| `get_component` | Fetch component only | Only for standalone base components |
| `get_component_file` | Fetch single file | Response >25K tokens, need specific file |
| `list_examples` | Browse page templates | User wants complete page layouts |
| `get_example` | Fetch complete page | Building from template |

## Component Categories

### Base Components (No Auth Required)

- **Buttons**: button, button-group
- **Forms**: input, select, textarea, checkbox, radio, switch, file-upload
- **Display**: avatar, badge, tag, progress, skeleton
- **Feedback**: alert, toast, tooltip
- **Data**: table (basic), pagination, empty-state
- **Navigation**: tabs, breadcrumbs, dropdown-menu

### Application Components (Pro License)

- **Navigation**: sidebars, headers, command-menus
- **Overlays**: modals, slideovers, dropdowns
- **Data Display**: tables (advanced), cards, stats
- **Dashboards**: complete dashboard templates
- **Settings**: settings panels, forms

### Marketing Components (Pro License)

- **Hero Sections**: landing page headers
- **Features**: feature grids, showcases
- **Pricing**: pricing tables with toggles
- **Testimonials**: customer testimonials
- **FAQ**: accordion-style FAQs
- **CTA**: call-to-action sections
- **Footers**: site footers

## Workflow Patterns

### Pattern 1: Add Single Component

```typescript
// 1. Search for component
const results = await search_components({ 
 query: 'settings modal' 
})

// 2. Fetch with dependencies (ALWAYS use this for Pro components)
const component = await get_component_with_deps({ 
 path: 'application/modals/settings-modal' 
})

// 3. Component response includes:
// - primary.files[] - main component files
// - baseComponents[] - all base component dependencies
// - allDependencies - npm packages needed
// - estimatedTokens - context usage
```

### Pattern 2: Build Complete Page from Template

```typescript
// 1. List available examples
const examples = await list_examples({ 
 category: 'application/dashboards' 
})

// 2. Fetch entire page
const page = await get_example({ 
 path: 'application/dashboards-01/01' 
})

// Returns 20-30+ files: page layout, charts, tables, cards, all base components
```

### Pattern 3: Recreate UI from Screenshot

```typescript
// Roy provides screenshot
// 1. Analyze layout - identify components needed
// Example: sidebar + header + card grid + table

// 2. Fetch each component with dependencies
const sidebar = await get_component_with_deps({ 
 path: 'application/sidebars/sidebar-01' 
})

const header = await get_component_with_deps({ 
 path: 'application/headers/header-01' 
})

// 3. Assemble with proper imports and structure
```

### Pattern 4: Large Component Handling

```typescript
// If get_component_with_deps returns >25K tokens:

// 1. First call to see structure
const overview = await get_component_with_deps({ 
 path: 'application/dashboards/dashboard-01' 
})

// 2. Review fileList with token estimates
// 3. Fetch individual files as needed
const file = await get_component_file({ 
 path: 'application/dashboards/dashboard-01',
 file: 'dashboard-layout.tsx'
})
```

## Response Structure

```typescript
interface ComponentResponse {
 primary: {
  name: string
  files: Array<{
   path: string
   code: string
  }>
  baseComponents: string[] // dependencies on base components
 }
 baseComponents: Array<{
  name: string
  files: Array<{ path: string, code: string }>
 }>
 allDependencies: string[] // npm packages
 estimatedTokens: number
 fileList: Array<{
  path: string
  tokens: number
 }>
}
```

## Code Integration Guidelines

### File Organization

```
src/
├── components/
│   ├── ui/              # Base components (button, input, etc.)
│   │   ├── button/
│   │   │   ├── button.tsx
│   │   │   └── button.test.tsx
│   │   └── input/
│   │       └── input.tsx
│   └── application/      # App components (modals, sidebars)
│       ├── modals/
│       └── sidebars/
└── app/                  # Next.js pages
```

### Import Patterns

```typescript
// Base components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Application components
import { SettingsModal } from '@/components/application/modals'
import { Sidebar } from '@/components/application/sidebars'
```

### Theme Integration

Components use UntitledUI design tokens:

```typescript
// Colors
bg-primary, bg-secondary, bg-tertiary
text-primary, text-secondary, text-tertiary

// Typography
text-display-2xl, text-display-xl
text-text-lg, text-text-md

// Spacing
gap-spacing-xl, p-spacing-lg
```

These tokens are pre-configured in starter kit's `tailwind.config.js`.

## Common Use Cases

### 1. Dashboard Setup

```
User: "Set up main app layout with sidebar and header"

Steps:
1. search_components({ query: 'sidebar navigation' })
2. get_component_with_deps({ path: 'application/sidebars/sidebar-01' })
3. get_component_with_deps({ path: 'application/headers/header-01' })
4. Create layout.tsx combining both with proper state management
```

### 2. Settings Page

```
User: "Add settings page with profile, notifications, billing sections"

Steps:
1. search_components({ query: 'settings' })
2. get_component_with_deps({ path: 'application/settings/settings-panel' })
3. Customize sections based on requirements
```

### 3. Pricing Page

```
User: "Build SaaS pricing page with 3 tiers"

Steps:
1. list_examples({ category: 'marketing' })
2. get_example({ path: 'marketing/pricing-sections/01' })
3. Customize tiers, features, CTAs
```

### 4. Modal Dialogs

```
User: "Add confirmation modal for delete action"

Steps:
1. search_components({ query: 'modal confirmation' })
2. get_component_with_deps({ path: 'application/modals/confirmation-modal' })
3. Wire up to delete action with proper state
```

## Troubleshooting

### Issue: Components don't look right / missing styles

**Cause:** Missing UntitledUI Tailwind configuration and design tokens.

**Solution:**

- Use official starter kit (required)
- Do NOT try to add components to existing projects without proper setup
- Starter kits include all necessary Tailwind config

### Issue: Import errors for base components

**Cause:** Used `get_component` instead of `get_component_with_deps`.

**Solution:**

- ALWAYS use `get_component_with_deps` for Pro components
- This includes all base component dependencies automatically

### Issue: Response too large (>25K tokens)

**Solution:**

1. Call `get_component_with_deps` first to see structure
2. Review `fileList` with token estimates
3. Use `get_component_file` to fetch individual files as needed

### Issue: Authentication errors for Pro components

**Solution:**

```bash
npx untitledui@latest login
# Or set UNTITLEDUI_LICENSE_KEY in MCP config
```

## Best Practices

1. **Always start with starter kit** - Don't skip this step
2. **Use `get_component_with_deps`** - Primary tool for fetching components
3. **Check token estimates** - Manage context window proactively
4. **Fetch complete pages for large features** - Use `get_example` for dashboards, landing pages
5. **Combine components strategically** - Build complex UIs from multiple fetches
6. **Preserve design tokens** - Don't replace with standard Tailwind classes
7. **Follow Roy's code style**:
   - Tabs for indentation
   - Single quotes
   - No trailing semicolons
   - Functional programming patterns

## Token Management

- Base components: ~300-500 tokens each
- Application components: ~800-2000 tokens
- Complete pages: ~10,000-25,000 tokens
- Always check `estimatedTokens` in response
- Use `get_component_file` for large components (>25K total)

## Example Conversations

**User**: "Add a user settings modal"
**Action**: `search_components` → `get_component_with_deps` → integrate with all dependencies

**User**: "Build me a dashboard like the analytics template"
**Action**: `list_examples` → `get_example` → customize with user's data

**User**: [screenshot] "Recreate this"
**Action**: Analyze → identify 3-5 components → fetch each with deps → assemble

**User**: "I need a pricing page"
**Action**: `get_example({ path: 'marketing/pricing-sections/01' })` → done in seconds

## Summary

This skill provides access to production-ready components instead of generating UI from scratch. Always:

1. Start with UntitledUI starter kit
2. Use `get_component_with_deps` as primary tool
3. Fetch complete pages with `get_example` when appropriate
4. Manage token usage proactively
5. Follow Roy's code style preferences
