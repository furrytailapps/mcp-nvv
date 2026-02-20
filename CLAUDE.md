# mcp-nvv

> For shared patterns and coding standards, see parent CLAUDE.md.

MCP server wrapping Naturvardsverket APIs for protected nature areas — Naturvardsregistret, Natura 2000, and Ramsar.

## Production URL

https://mcp-nvv.vercel.app/mcp

## Tools

- `nvv_lookup` — Municipality/county code lookup (use codes with nvv_search)
- `nvv_search` — Search by kommun/lan codes (all 3 sources) or bbox (national + N2000 only)
- `nvv_detail` — Get detail for any area by id + source
- `nvv_extent` — Combined bounding box for areas across all sources

## Quirks

- No env vars needed (public APIs)
- Three data sources behind one MCP: Naturvardsregistret, Natura 2000, Ramsar
- No Ramsar WFS exists — bbox search covers national + N2000 only
- Always uses `Gallande` status (no status parameter exposed)
- Name-based queries require `nvv_lookup` first to get kommun/lan codes
- `nvv_extent` expects IDs grouped by source
