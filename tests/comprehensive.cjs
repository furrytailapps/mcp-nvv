// Comprehensive test script for all NVV MCP tools
const http = require('http');

function parseSSE(sseText) {
  const lines = sseText.split('\n');
  let data = '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      data += line.substring(6);
    }
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function testMCP(method, params = {}) {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Accept': 'application/json, text/event-stream'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const parsed = parseSSE(body);
        if (parsed) {
          resolve(parsed);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ rawBody: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🧪 Comprehensive NVV MCP Server Test\n');
  const results = { passed: 0, failed: 0, tests: [] };

  function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
      console.log(`   ✅ ${name} ${details}`);
    } else {
      results.failed++;
      console.log(`   ❌ ${name} ${details}`);
    }
  }

  // Test 1: Initialize
  console.log('1️⃣ Testing MCP initialization...');
  try {
    const initResult = await testMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'comprehensive-test', version: '1.0.0' }
    });
    recordTest('Initialize', !!initResult.result?.serverInfo,
      `(server: ${initResult.result?.serverInfo?.name || 'unknown'})`);
  } catch (error) {
    recordTest('Initialize', false, `(error: ${error.message})`);
  }

  // Test 2: List tools
  console.log('\n2️⃣ Testing tools/list...');
  try {
    const toolsResult = await testMCP('tools/list');
    const toolCount = toolsResult.result?.tools?.length || 0;
    recordTest('List tools', toolCount === 9, `(found ${toolCount}/9 tools)`);
  } catch (error) {
    recordTest('List tools', false, `(error: ${error.message})`);
  }

  // Test 3: nvv_lookup_municipality
  console.log('\n3️⃣ Testing nvv_lookup_municipality...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_lookup_municipality',
      arguments: { query: 'Stockholm' }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Municipality lookup - exact match',
      data.municipalities?.[0]?.code === '0180',
      `(found: ${data.municipalities?.[0]?.name || 'none'})`);

    // Test partial match
    const partialResult = await testMCP('tools/call', {
      name: 'nvv_lookup_municipality',
      arguments: { query: 'stock' }
    });
    const partialData = JSON.parse(partialResult.result?.content?.[0]?.text || '{}');
    recordTest('Municipality lookup - partial match',
      partialData.count > 0,
      `(found ${partialData.count} matches)`);
  } catch (error) {
    recordTest('Municipality lookup', false, `(error: ${error.message})`);
  }

  // Test 4: nvv_lookup_county
  console.log('\n4️⃣ Testing nvv_lookup_county...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_lookup_county',
      arguments: { query: 'Stockholm' }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('County lookup',
      data.counties?.[0]?.code === '01',
      `(found: ${data.counties?.[0]?.name || 'none'})`);
  } catch (error) {
    recordTest('County lookup', false, `(error: ${error.message})`);
  }

  // Test 5: nvv_list_protected_areas
  console.log('\n5️⃣ Testing nvv_list_protected_areas...');
  try {
    // Test with kommun parameter
    const result = await testMCP('tools/call', {
      name: 'nvv_list_protected_areas',
      arguments: { kommun: '0180', limit: 5 }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('List areas by kommun',
      data.count > 0 && data.areas?.length > 0,
      `(found ${data.count} areas)`);

    // Test validation - should fail without parameters
    const invalidResult = await testMCP('tools/call', {
      name: 'nvv_list_protected_areas',
      arguments: { limit: 5 }
    });
    const invalidData = JSON.parse(invalidResult.result?.content?.[0]?.text || '{}');
    recordTest('List areas - validation error handling',
      invalidData.error === true,
      '(correctly rejected missing parameters)');

    // Store first area for subsequent tests
    global.testAreaId = data.areas?.[0]?.id;
    global.testAreaName = data.areas?.[0]?.name;
  } catch (error) {
    recordTest('List areas', false, `(error: ${error.message})`);
  }

  if (!global.testAreaId) {
    console.log('\n⚠️  Skipping remaining tests - no area ID available');
    printSummary(results);
    return;
  }

  console.log(`\n📍 Using test area: ${global.testAreaName} (ID: ${global.testAreaId})\n`);

  // Test 6: nvv_get_area_geometry
  console.log('6️⃣ Testing nvv_get_area_geometry...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_get_area_geometry',
      arguments: { areaId: global.testAreaId }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get area geometry',
      data.geometry && (data.geometry.startsWith('MULTI') || data.geometry.startsWith('POLYGON')),
      `(WKT length: ${data.geometry?.length || 0} chars)`);
  } catch (error) {
    recordTest('Get area geometry', false, `(error: ${error.message})`);
  }

  // Test 7: nvv_get_area_purposes
  console.log('\n7️⃣ Testing nvv_get_area_purposes...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_get_area_purposes',
      arguments: { areaId: global.testAreaId }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get area purposes',
      Array.isArray(data.purposes),
      `(found ${data.purposes?.length || 0} purposes)`);
  } catch (error) {
    recordTest('Get area purposes', false, `(error: ${error.message})`);
  }

  // Test 8: nvv_get_area_land_cover
  console.log('\n8️⃣ Testing nvv_get_area_land_cover...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_get_area_land_cover',
      arguments: { areaId: global.testAreaId }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get area land cover',
      Array.isArray(data.land_cover),
      `(found ${data.land_cover?.length || 0} classifications)`);
  } catch (error) {
    recordTest('Get area land cover', false, `(error: ${error.message})`);
  }

  // Test 9: nvv_get_area_environmental_goals
  console.log('\n9️⃣ Testing nvv_get_area_environmental_goals...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_get_area_environmental_goals',
      arguments: { areaId: global.testAreaId }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get environmental goals',
      Array.isArray(data.environmental_goals),
      `(found ${data.environmental_goals?.length || 0} goals)`);
  } catch (error) {
    recordTest('Get environmental goals', false, `(error: ${error.message})`);
  }

  // Test 10: nvv_get_area_regulations
  console.log('\n🔟 Testing nvv_get_area_regulations...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_get_area_regulations',
      arguments: { areaId: global.testAreaId }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get area regulations',
      Array.isArray(data.regulations),
      `(found ${data.regulations?.length || 0} regulations)`);
  } catch (error) {
    recordTest('Get area regulations', false, `(error: ${error.message})`);
  }

  // Test 11: nvv_get_areas_extent
  console.log('\n1️⃣1️⃣ Testing nvv_get_areas_extent...');
  try {
    const result = await testMCP('tools/call', {
      name: 'nvv_get_areas_extent',
      arguments: { areaIds: [global.testAreaId] }
    });
    const data = JSON.parse(result.result?.content?.[0]?.text || '{}');
    recordTest('Get areas extent',
      data.extent && data.extent.startsWith('POLYGON'),
      `(WKT: ${data.extent?.substring(0, 50)}...)`);
  } catch (error) {
    recordTest('Get areas extent', false, `(error: ${error.message})`);
  }

  printSummary(results);
}

function printSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name} ${t.details}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
