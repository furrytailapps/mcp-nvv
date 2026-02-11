# mcp-nvv - Claude Code Guide

> **Keep this file up to date.** When tools, API endpoints, or project structure change, update this file. For shared patterns and design decisions, see `../CLAUDE.md`.

MCP server wrapping Naturvårdsverket (Swedish Environmental Protection Agency) APIs for protected nature areas in Sweden. Covers three data sources:

- **Naturvardsregistret** - National protected areas (nature reserves, national parks)
- **Natura 2000** - EU protected areas with species and habitat data
- **Ramsar** - International wetland convention sites

## Production URL

```
https://mcp-nvv.vercel.app/mcp
```

## Available Tools (<!-- AUTO:tool_count -->4<!-- /AUTO -->)

| Tool         | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `nvv_lookup` | Municipality and county code lookup. Use codes with nvv_search.              |
| `nvv_search` | Unified search across all 3 sources (national, N2000, Ramsar) in parallel.   |
| `nvv_detail` | Get detail for any area by id + source. Routes to correct API automatically. |
| `nvv_extent` | Combined bounding box for areas across all sources.                          |

### Tool workflow

1. `nvv_lookup` — convert place name to kommun/lan code
2. `nvv_search` — pass kommun or lan code, gets ALL protected areas from ALL sources
3. `nvv_detail` — pass `id` + `source` from search results for full details
4. `nvv_extent` — pass IDs grouped by source for combined bounding box

## Project Structure

```
src/
├── app/[transport]/route.ts   # MCP endpoint
├── clients/
│   ├── nvv-client.ts          # Naturvardsregistret API client
│   ├── n2000-client.ts        # Natura 2000 API client
│   └── ramsar-client.ts       # Ramsar API client
├── data/
│   ├── kommuner.json          # Swedish municipality codes
│   └── lan.json               # Swedish county codes
├── lib/
│   ├── concurrency.ts         # Batch operation helper (max 2 concurrent)
│   ├── errors.ts              # Error classes
│   ├── http-client.ts         # HTTP wrapper
│   ├── response.ts            # Response formatting
│   ├── search-helpers.ts      # Search utilities
│   └── wkt-utils.ts           # WKT geometry parsing
├── tools/
│   ├── index.ts               # Tool registry (4 tools)
│   ├── lookup.ts              # nvv_lookup
│   ├── search.ts              # nvv_search — fan-out to all 3 sources
│   ├── detail.ts              # nvv_detail — dispatcher by source
│   └── extent.ts              # nvv_extent — combined bounding box
└── types/
    ├── nvv-api.ts             # Naturvardsregistret types
    ├── n2000-api.ts           # Natura 2000 types
    └── ramsar-api.ts          # Ramsar types
```

## APIs

### Naturvardsregistret API

**Base URL:** `https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3`

```typescript
nvvClient.getArea(areaId, status);
nvvClient.listAreas({ kommun, lan, namn, limit });
nvvClient.getAreaWkt(areaId, status);
nvvClient.getAreaPurposes(areaId, status);
nvvClient.getAreaLandCover(areaId, status);
nvvClient.getAreaEnvironmentalGoals(areaId, status);
nvvClient.getAreaRegulations(areaId, status);
nvvClient.getAreaDocuments(areaId, status);
nvvClient.getAreasExtent(areaIds);
```

### Natura 2000 API

**Base URL:** `https://geodata.naturvardsverket.se/n2000/rest/v3`

```typescript
n2000Client.listAreas({ kommun, lan, namn, artnamn, naturtypkod, limit });
n2000Client.getArea(kod);
n2000Client.getAreaSpecies(kod);
n2000Client.getAreaHabitats(kod);
n2000Client.getAreaLandCover(kod);
n2000Client.getAreaWkt(kod);
n2000Client.getAreaDocuments(kod);
n2000Client.getAllSpecies(); // intentionally orphaned (reference data)
n2000Client.getSpeciesByGroup(group); // intentionally orphaned (reference data)
n2000Client.getAllHabitats(); // intentionally orphaned (reference data)
```

### Ramsar API

**Base URL:** `https://geodata.naturvardsverket.se/internationellakonventioner/rest/v3`

```typescript
ramsarClient.listAreas({ kommun, lan, namn, limit });
ramsarClient.getArea(id);
ramsarClient.getAreaWkt(id);
ramsarClient.getAreaLandCover(id);
ramsarClient.getProtectionTypes(); // intentionally orphaned (reference data)
```

### Status Values (Naturvardsregistret only)

Tools always use `Gällande` (active/current). No status parameter exposed.

## Concurrency

NVV API is rate-limited. Use `runWithConcurrency()` from `@/lib/concurrency.ts` with `NVV_API_CONCURRENCY = 2`.

## Workarounds

**Extent endpoint bug:** NVV API's extent endpoint fails with Oracle errors on multiple IDs. Workaround in client `computeExtentClientSide()` fetches individual geometries and computes bounding box client-side.

## Development

```bash
npm run dev          # Start dev server (localhost:3000)
npm run typecheck    # Type check
npm run lint         # Lint
npm run prettier:fix # Format code
```

## Testing

Use the shared MCP test runner (no project-local test files):

```bash
node ~/.claude/scripts/mcp-test-runner.cjs https://mcp-nvv.vercel.app/mcp --all -v
```
