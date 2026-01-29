# mcp-nvv - Claude Code Guide

> **Keep this file up to date.** When tools, API endpoints, or project structure change, update this file. For shared patterns and design decisions, see `../CLAUDE.md`.

MCP server wrapping Naturvårdsverket (Swedish Environmental Protection Agency) APIs for protected nature areas in Sweden. Covers three data sources:

- **Naturvardsregistret** - National protected areas (nature reserves, national parks)
- **Natura 2000** - EU protected areas with species and habitat data
- **Ramsar** - International wetland convention sites

## Production URL

```
https://nvv-mcp.vercel.app/mcp
```

## Available Tools (7)

### Naturvardsregistret (National)

| Tool                       | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `nvv_list_protected_areas` | Search by municipality/county/name                                  |
| `nvv_get_area_detail`      | Fetch geometry, purposes, land cover, regulations, goals, documents |
| `nvv_lookup`               | Municipality and county code lookup                                 |
| `nvv_get_areas_extent`     | Calculate bounding box for multiple areas                           |

### Natura 2000 (EU)

| Tool              | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `nvv_n2000_search` | Search N2000 areas by location, species, or habitat type |
| `nvv_n2000_detail` | Get species and EU habitat types for an N2000 area       |

### Ramsar (International Wetlands)

| Tool               | Description                           |
| ------------------ | ------------------------------------- |
| `nvv_ramsar_search` | Search Ramsar wetland sites (~68 total) |

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
│   ├── index.ts               # Tool registry (7 tools)
│   ├── list-protected-areas.ts
│   ├── get-area-detail.ts
│   ├── lookup.ts
│   ├── get-areas-extent.ts
│   ├── n2000-search.ts        # Natura 2000 search
│   ├── n2000-detail.ts        # Natura 2000 details (species/habitats)
│   └── ramsar-search.ts       # Ramsar wetland search
└── types/
    ├── nvv-api.ts             # Naturvardsregistret types
    ├── n2000-api.ts           # Natura 2000 types
    └── ramsar-api.ts          # Ramsar types
```

## APIs

### Naturvardsregistret API

**Base URL:** `https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3`

```typescript
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
n2000Client.getAllSpecies();
n2000Client.getSpeciesByGroup(group);
n2000Client.getAllHabitats();
```

### Ramsar API

**Base URL:** `https://geodata.naturvardsverket.se/internationellakonventioner/rest/v3`

```typescript
ramsarClient.listAreas({ kommun, lan, namn, limit });
ramsarClient.getArea(id);
ramsarClient.getAreaWkt(id);
ramsarClient.getAreaLandCover(id);
ramsarClient.getProtectionTypes();
```

### Status Values (Naturvardsregistret only)

- `Gallande` (default) - Active/In effect
- `Overklagat` - Appealed
- `Beslutat` - Decided

## Concurrency

NVV API is rate-limited. Use `runWithConcurrency()` from `@/lib/concurrency.ts` with `NVV_API_CONCURRENCY = 2`.

## Workarounds

**Extent endpoint bug:** NVV API's extent endpoint fails with Oracle errors on multiple IDs. Workaround in `get-areas-extent.ts` fetches individual geometries and computes bounding box client-side.

## Development

```bash
npm run dev          # Start dev server (localhost:3000)
npm run typecheck    # Type check
npm run lint         # Lint
npm run prettier:fix # Format code
```

## Testing

Test files in `tests/` directory:

- `basic.cjs` - Basic connectivity
- `comprehensive.cjs` - All tools
- `edge-cases.cjs` - Error handling
