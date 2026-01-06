# NVV MCP Server

Model Context Protocol (MCP) server wrapping the Naturvårdsverket (Swedish Environmental Protection Agency) API for protected nature areas in Sweden.

## Features

This MCP server provides 9 tools for accessing Swedish protected nature areas data:

- **List Protected Areas** - Search and filter protected areas by municipality, county, or name
- **Get Area Geometry** - Retrieve WKT geometry in SWEREF99 TM coordinate system
- **Get Area Purposes** - Retrieve protection purposes and classifications
- **Get Area Land Cover** - Get detailed land cover classification (NMD data)
- **Get Environmental Goals** - Retrieve environmental goals (miljömål) for areas
- **Get Area Regulations** - Get regulation zones (föreskriftsområden)
- **Get Areas Extent** - Calculate bounding box for multiple areas
- **Lookup Municipality** - Search Swedish municipality codes
- **Lookup County** - Search Swedish county codes

## Installation

```bash
npm install
```

## Usage

### Local Development

Start the development server:

```bash
npm run dev
```

The MCP server will be available at `http://localhost:3000/mcp`

### Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "nvv": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp"]
    }
  }
}
```

For a deployed Vercel instance:

```json
{
  "mcpServers": {
    "nvv": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-deployment.vercel.app/mcp"]
    }
  }
}
```

### Vercel Deployment

Deploy to Vercel with a single command:

```bash
vercel deploy
```

No environment variables are required as the Naturvårdsverket API is publicly accessible.

## Available Tools

### 1. nvv_list_protected_areas

List protected nature areas with optional filtering.

**Parameters:**
- `kommun` (string, optional) - Municipality code (e.g., "0180" for Stockholm)
- `lan` (string, optional) - County code (e.g., "01" for Stockholm County)
- `namn` (string, optional) - Name search query
- `limit` (number, optional) - Maximum results, 1-500 (default: 100)

**Example:**
```typescript
nvv_list_protected_areas({ kommun: "0180", limit: 5 })
```

**Returns:**
```json
{
  "areas": [
    {
      "id": "2000603",
      "name": "Judarskogen",
      "type": "Naturreservat",
      "municipality": "Stockholm",
      "county": "Stockholms län",
      "status": "Gällande"
    }
  ],
  "count": 5,
  "total": 156
}
```

### 2. nvv_get_area_geometry

Get WKT (Well-Known Text) geometry for a protected area.

**Parameters:**
- `area_id` (string, required) - Protected area ID

**Example:**
```typescript
nvv_get_area_geometry({ area_id: "2000603" })
```

**Returns:**
```json
{
  "area_id": "2000603",
  "name": "Judarskogen",
  "geometry_wkt": "POLYGON((...))",
  "coordinate_system": "SWEREF99 TM (EPSG:3006)"
}
```

### 3. nvv_get_area_purposes

Get protection purposes and classifications.

**Parameters:**
- `area_id` (string, required) - Protected area ID

**Example:**
```typescript
nvv_get_area_purposes({ area_id: "2000603" })
```

**Returns:**
```json
{
  "area_id": "2000603",
  "name": "Judarskogen",
  "purposes": [
    {
      "type": "Skyddsändamål",
      "description": "Bevara biologisk mångfald"
    }
  ]
}
```

### 4. nvv_get_area_land_cover

Get detailed land cover classification (NMD - National Land Cover Database).

**Parameters:**
- `area_id` (string, required) - Protected area ID

**Example:**
```typescript
nvv_get_area_land_cover({ area_id: "2000603" })
```

**Returns:**
```json
{
  "area_id": "2000603",
  "name": "Judarskogen",
  "land_cover": [
    {
      "code": "111",
      "class": "Barrskog",
      "area_hectares": 45.2,
      "percentage": 67.5
    }
  ],
  "total_area_hectares": 67.0
}
```

### 5. nvv_get_area_environmental_goals

Get Swedish environmental objectives (miljömål) related to the area.

**Parameters:**
- `area_id` (string, required) - Protected area ID

**Example:**
```typescript
nvv_get_area_environmental_goals({ area_id: "2000603" })
```

**Returns:**
```json
{
  "area_id": "2000603",
  "name": "Judarskogen",
  "environmental_goals": [
    {
      "goal": "Levande skogar",
      "description": "Skogens och skogsmarkens värde för biologisk produktion skall skyddas samtidigt som den biologiska mångfalden bevaras..."
    }
  ]
}
```

### 6. nvv_get_area_regulations

Get regulation zones (föreskriftsområden) within the protected area.

**Parameters:**
- `area_id` (string, required) - Protected area ID

**Example:**
```typescript
nvv_get_area_regulations({ area_id: "2000603" })
```

**Returns:**
```json
{
  "area_id": "2000603",
  "name": "Judarskogen",
  "regulations": [
    {
      "zone_type": "Totalförbudsområde",
      "description": "Område där all verksamhet är förbjuden",
      "area_hectares": 12.5
    }
  ]
}
```

### 7. nvv_get_areas_extent

Calculate bounding box (extent) for one or more protected areas.

**Parameters:**
- `area_ids` (array of strings, required) - Protected area IDs

**Example:**
```typescript
nvv_get_areas_extent({ area_ids: ["2000603", "2000604"] })
```

**Returns:**
```json
{
  "extent": {
    "min_x": 664825.43,
    "min_y": 6579234.12,
    "max_x": 668234.87,
    "max_y": 6582456.34
  },
  "coordinate_system": "SWEREF99 TM (EPSG:3006)",
  "area_count": 2
}
```

### 8. nvv_lookup_municipality

Search for Swedish municipality codes.

**Parameters:**
- `query` (string, required) - Municipality name or partial name

**Example:**
```typescript
nvv_lookup_municipality({ query: "Stockholm" })
```

**Returns:**
```json
{
  "matches": [
    {
      "code": "0180",
      "name": "Stockholm"
    }
  ]
}
```

### 9. nvv_lookup_county

Search for Swedish county codes.

**Parameters:**
- `query` (string, required) - County name or partial name

**Example:**
```typescript
nvv_lookup_county({ query: "Stockholm" })
```

**Returns:**
```json
{
  "matches": [
    {
      "code": "01",
      "name": "Stockholms län"
    }
  ]
}
```

## API Reference

### Base API
- **URL:** `https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3`
- **Documentation:** [Naturvårdsverket API](https://www.naturvardsverket.se/)

### Coordinate System
- **System:** SWEREF99 TM (EPSG:3006)
- **Format:** WKT (Well-Known Text)

### Status Values
- `Gällande` - Active/In effect
- `Överklagat` - Appealed
- `Beslutat` - Decided

## Examples

### Find protected areas in Stockholm

```typescript
// Step 1: Look up municipality code
const municipality = await nvv_lookup_municipality({ query: "Stockholm" });
// Returns: { code: "0180", name: "Stockholm" }

// Step 2: List protected areas
const areas = await nvv_list_protected_areas({
  kommun: "0180",
  limit: 5
});
// Returns: 5 protected areas including Judarskogen

// Step 3: Get detailed geometry
const geometry = await nvv_get_area_geometry({
  area_id: areas.areas[0].id
});
// Returns: WKT geometry in SWEREF99 TM
```

### Analyze land cover in a nature reserve

```typescript
// Get land cover classification
const landCover = await nvv_get_area_land_cover({
  area_id: "2000603"
});
// Returns: Detailed breakdown of forest types, wetlands, etc.

// Get environmental goals
const goals = await nvv_get_area_environmental_goals({
  area_id: "2000603"
});
// Returns: Related Swedish environmental objectives
```

## Testing

Comprehensive test suite available in the `tests/` directory. See [tests/README.md](tests/README.md) for details.

To run tests:

```bash
# Start dev server in one terminal
npm run dev

# Run tests in another terminal
node tests/basic.cjs
node tests/comprehensive.cjs
```

Available test files:
- `basic.cjs` - Basic connectivity and tool availability
- `comprehensive.cjs` - All tools with various scenarios
- `edge-cases.cjs` - Error handling and edge cases
- `geometry.cjs` - Geometry retrieval tests
- `single-tool.cjs` - Single tool isolation testing
- `tools-list.cjs` - MCP tools list validation

## Architecture

```
nvv-mcp/
├── src/
│   ├── app/
│   │   └── mcp/
│   │       └── route.ts          # MCP endpoint handler
│   ├── clients/
│   │   └── nvv-client.ts         # NVV API client
│   ├── data/
│   │   ├── municipalities.ts     # Swedish municipality lookup data
│   │   └── counties.ts           # Swedish county lookup data
│   ├── lib/
│   │   ├── errors.ts             # Structured error classes
│   │   ├── http-client.ts        # Reusable HTTP client
│   │   └── response-builder.ts   # MCP response formatting
│   └── tools/
│       ├── list-protected-areas.ts
│       ├── get-area-geometry.ts
│       ├── get-area-purposes.ts
│       ├── get-area-land-cover.ts
│       ├── get-area-env-goals.ts
│       ├── get-area-regulations.ts
│       ├── get-areas-extent.ts
│       ├── lookup-municipality.ts
│       └── lookup-county.ts
├── tests/                        # Test suite
└── vercel.json                   # Vercel deployment config
```

### Design Principles

- **Pure API Wrapper:** No business logic, direct mapping to upstream API
- **Type Safety:** TypeScript strict mode throughout
- **Reusable Utilities:** `lib/` directory contains shared utilities for future MCPs
- **Structured Errors:** Custom error classes with proper HTTP status codes
- **Zod Validation:** Schema validation for all tool inputs

## Deployment

### Vercel Configuration

The project includes `vercel.json` with optimized settings:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/$1" }
  ]
}
```

### Environment Variables

No environment variables required. The Naturvårdsverket API is publicly accessible.

### MCP Endpoints

- **HTTP Streamable:** `/mcp` (recommended)
- **SSE (legacy):** `/sse`

## Development

### Scripts

```bash
npm run dev       # Start Next.js development server
npm run build     # Build for production
npm run start     # Run production build
npm run lint      # Run ESLint
npm run typecheck # TypeScript type checking
```

### Adding New Tools

1. Create tool file in `src/tools/`
2. Define Zod schema using raw shape (not `z.object()`)
3. Implement handler function
4. Export from tool file
5. Add to `src/app/mcp/route.ts` tools array

Example:

```typescript
// src/tools/my-new-tool.ts
import { z } from "zod";

export const myNewToolInputSchema = {
  param: z.string().describe("Parameter description")
};

export async function handleMyNewTool(input: { param: string }) {
  // Implementation
}
```

## Project Status

- ✅ All 9 tools functional and tested
- ✅ Type-safe with TypeScript strict mode
- ✅ Production-ready
- ✅ Comprehensive test suite
- ✅ Vercel deployment configured
- ✅ Full documentation

## Related Resources

- [Naturvårdsverket](https://www.naturvardsverket.se/) - Swedish Environmental Protection Agency
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [mcp-handler](https://github.com/vercel/mcp-handler) - Vercel MCP handler package
- [Next.js Documentation](https://nextjs.org/docs) - Next.js framework
- [SWEREF99 TM](https://www.lantmateriet.se/sweref99) - Swedish coordinate system reference

## License

No license specified.

## Author

Yesper
