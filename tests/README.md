# NVV MCP Test Suite

Comprehensive test suite for the NVV MCP server. These tests verify all 9 tools work correctly with the Naturvårdsverket API.

## Prerequisites

The MCP development server must be running:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Running Tests

All test files are CommonJS scripts that can be run directly with Node.js:

```bash
# Run individual test files
node tests/basic.cjs
node tests/comprehensive.cjs
node tests/edge-cases.cjs
node tests/geometry.cjs
node tests/single-tool.cjs
node tests/tools-list.cjs
```

## Test Files

### basic.cjs
Basic connectivity and tool availability test.

**Tests:**
- MCP server connectivity
- Tools list endpoint
- Basic tool invocation
- Response format validation

**Usage:**
```bash
node tests/basic.cjs
```

### comprehensive.cjs
Comprehensive test of all 9 tools with various scenarios.

**Tests:**
- `nvv_list_protected_areas` - With kommun, län, namn filters
- `nvv_get_area_geometry` - WKT geometry retrieval
- `nvv_get_area_purposes` - Protection purposes
- `nvv_get_area_land_cover` - NMD land cover data
- `nvv_get_area_environmental_goals` - Environmental objectives
- `nvv_get_area_regulations` - Regulation zones
- `nvv_get_areas_extent` - Bounding box calculation
- `nvv_lookup_municipality` - Municipality code lookup
- `nvv_lookup_county` - County code lookup

**Usage:**
```bash
node tests/comprehensive.cjs
```

**Expected Output:**
```
✅ List Protected Areas (by kommun): Found 5 areas
✅ Get Area Geometry: Retrieved WKT geometry
✅ Get Area Purposes: Found protection purposes
...
All comprehensive tests passed! ✅
```

### edge-cases.cjs
Error handling and edge case validation.

**Tests:**
- Invalid area IDs
- Missing required parameters
- Empty results handling
- API error responses
- Timeout scenarios
- Invalid municipality/county codes

**Usage:**
```bash
node tests/edge-cases.cjs
```

### geometry.cjs
Focused testing of geometry retrieval.

**Tests:**
- WKT format validation
- SWEREF99 TM coordinate system
- Polygon geometry structure
- Multi-polygon handling

**Usage:**
```bash
node tests/geometry.cjs
```

### single-tool.cjs
Isolation testing for individual tool debugging.

**Tests:**
- Single tool invocation
- Parameter validation
- Response structure
- Error handling

**Usage:**
```bash
# Edit the file to change which tool is tested
node tests/single-tool.cjs
```

### tools-list.cjs
MCP tools list validation.

**Tests:**
- All 9 tools are registered
- Tool schemas are valid
- Tool descriptions are present
- Input parameters are documented

**Usage:**
```bash
node tests/tools-list.cjs
```

**Expected Output:**
```
Available tools:
  1. nvv_list_protected_areas
  2. nvv_get_area_geometry
  3. nvv_get_area_purposes
  ...
All 9 tools registered ✅
```

## Test Data

The tests use real data from the Naturvårdsverket API:

- **Stockholm Municipality:** Code `0180`
- **Example Area:** Judarskogen (ID: `2000603`)
- **County:** Stockholms län (Code `01`)

## Common Issues

### Server Not Running

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:**
```bash
# Start the dev server in a separate terminal
npm run dev
```

### API Rate Limiting

**Error:**
```
Error: API request failed: 429 Too Many Requests
```

**Solution:**
- Wait a few seconds between test runs
- The Naturvårdsverket API has rate limits

### Invalid Test Data

**Error:**
```
Error: Protected area not found
```

**Solution:**
- The test area ID may have changed
- Update test files with current area IDs from the API
- Use `nvv_list_protected_areas` to find valid IDs

## Writing New Tests

Example test structure:

```javascript
async function testMyFeature() {
  const response = await fetch('http://localhost:3000/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'nvv_list_protected_areas',
        arguments: { kommun: '0180', limit: 5 }
      },
      id: 1
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error('❌ Test failed:', data.error.message);
    return false;
  }

  console.log('✅ Test passed:', data.result.content[0].text);
  return true;
}

testMyFeature();
```

## Test Coverage

Current test coverage includes:

- ✅ All 9 MCP tools
- ✅ Happy path scenarios
- ✅ Error handling
- ✅ Edge cases
- ✅ Parameter validation
- ✅ Response format validation
- ✅ WKT geometry parsing
- ✅ Municipality/county lookup
- ✅ Multiple area extent calculation

## Contributing

When adding new tools or features:

1. Add test cases to `comprehensive.cjs`
2. Add error scenarios to `edge-cases.cjs`
3. Update this README with new test descriptions
4. Verify all existing tests still pass

## Debugging

Enable verbose logging:

```javascript
// Add to any test file
console.log('Request:', JSON.stringify(requestBody, null, 2));
console.log('Response:', JSON.stringify(responseData, null, 2));
```

Check server logs:

```bash
# Server terminal shows request logs
npm run dev
# Watch for errors and API responses
```
