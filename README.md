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
