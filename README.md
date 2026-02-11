# NVV MCP Server

MCP server for Swedish protected nature areas via Naturvardsverket APIs. Covers three data sources:

- **National** (Naturvardsregistret) - Nature reserves, national parks
- **Natura 2000** (N2000) - EU protected areas with species/habitat data
- **Ramsar** - International wetland convention sites

Production URL: `https://mcp-nvv.vercel.app/mcp`

## Tools (4)

| Tool         | Description                                     |
| ------------ | ----------------------------------------------- |
| `nvv_lookup` | Municipality and county code lookup             |
| `nvv_search` | Unified search across all 3 sources in parallel |
| `nvv_detail` | Detailed info for any area by id + source       |
| `nvv_extent` | Combined bounding box for areas across sources  |

### Workflow

1. `nvv_lookup` — convert place name to kommun/lan code
2. `nvv_search` — search all sources with kommun or lan code
3. `nvv_detail` — get details using `id` + `source` from search results
4. `nvv_extent` — get combined bounding box for multiple areas

### nvv_detail include options

| Include     | National | N2000 | Ramsar |
| ----------- | -------- | ----- | ------ |
| geometry    | yes      | yes   | yes    |
| land_cover  | yes      | yes   | yes    |
| documents   | yes      | yes   | no     |
| purposes    | yes      | no    | no     |
| regulations | yes      | no    | no     |
| env_goals   | yes      | no    | no     |
| species     | no       | yes   | no     |
| habitats    | no       | yes   | no     |
| all         | yes      | yes   | yes    |

## Development

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (localhost:3000)
npm run typecheck # Type check
npm run lint      # Lint
npm run prettier:fix # Format
```

## Testing

Use the shared MCP test runner:

```bash
# All tools
node ~/.claude/scripts/mcp-test-runner.cjs https://mcp-nvv.vercel.app/mcp --all -v

# LLM compatibility simulation
node ~/.claude/scripts/mcp-test-runner.cjs https://mcp-nvv.vercel.app/mcp --all --llm-sim -v
```

## Deployment

```bash
vercel deploy
```

No environment variables required - the Naturvardsverket API is publicly accessible.

## Architecture

See `CLAUDE.md` for detailed project structure, API reference, and development patterns.
