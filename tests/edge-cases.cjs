// Test edge cases and error handling
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
  console.log('🧪 Edge Cases and Error Handling Tests\n');

  // Test 1: Invalid area ID
  console.log('1️⃣ Testing invalid area ID...');
  const invalidAreaResult = await testMCP('tools/call', {
    name: 'nvv_get_area_geometry',
    arguments: { areaId: '999999999' }
  });
  const invalidData = JSON.parse(invalidAreaResult.result?.content?.[0]?.text || '{}');
  console.log(invalidData.error ? '   ✅ Correctly handled invalid area ID' : '   ❌ Should have errored');
  if (invalidData.error) {
    console.log(`   📝 Error: ${invalidData.message}`);
  }

  // Test 2: Search by area name
  console.log('\n2️⃣ Testing search by area name...');
  const nameResult = await testMCP('tools/call', {
    name: 'nvv_list_protected_areas',
    arguments: { namn: 'Judarskogen' }
  });
  const nameData = JSON.parse(nameResult.result?.content?.[0]?.text || '{}');
  console.log(nameData.count > 0 ? `   ✅ Found by name: ${nameData.count} areas` : '   ❌ Should find areas');

  // Test 3: Search by county (län)
  console.log('\n3️⃣ Testing search by county code...');
  const countyResult = await testMCP('tools/call', {
    name: 'nvv_list_protected_areas',
    arguments: { lan: '01' }
  });
  const countyData = JSON.parse(countyResult.result?.content?.[0]?.text || '{}');
  console.log(countyData.count > 0 ? `   ✅ Found by county: ${countyData.count} areas` : '   ❌ Should find areas');

  // Test 4: Municipality not found
  console.log('\n4️⃣ Testing municipality lookup with no match...');
  const noMatchResult = await testMCP('tools/call', {
    name: 'nvv_lookup_municipality',
    arguments: { query: 'ThisCityDoesNotExist12345' }
  });
  const noMatchData = JSON.parse(noMatchResult.result?.content?.[0]?.text || '{}');
  console.log(noMatchData.count === 0 ? '   ✅ Correctly returns 0 results' : '   ❌ Should return 0 results');

  // Test 5: Multiple area IDs for extent
  console.log('\n5️⃣ Testing extent with multiple area IDs...');
  const multiExtentResult = await testMCP('tools/call', {
    name: 'nvv_get_areas_extent',
    arguments: { areaIds: ['2000019', '2000002'] }
  });
  const multiExtentData = JSON.parse(multiExtentResult.result?.content?.[0]?.text || '{}');
  console.log(multiExtentData.extent ? `   ✅ Got extent for ${multiExtentData.count} areas` : '   ❌ Should get extent');

  // Test 6: Different decision status
  console.log('\n6️⃣ Testing different decision status...');
  const statusResult = await testMCP('tools/call', {
    name: 'nvv_get_area_purposes',
    arguments: { areaId: '2000019', status: 'Gällande' }
  });
  const statusData = JSON.parse(statusResult.result?.content?.[0]?.text || '{}');
  console.log(Array.isArray(statusData.purposes) ?
    `   ✅ Got purposes with explicit status: ${statusData.purposes.length}` :
    '   ❌ Should get purposes');

  // Test 7: Limit parameter
  console.log('\n7️⃣ Testing limit parameter...');
  const limitResult = await testMCP('tools/call', {
    name: 'nvv_list_protected_areas',
    arguments: { kommun: '0180', limit: 2 }
  });
  const limitData = JSON.parse(limitResult.result?.content?.[0]?.text || '{}');
  console.log(limitData.areas?.length <= 2 ?
    `   ✅ Respected limit: ${limitData.areas?.length} areas returned` :
    '   ❌ Should respect limit');

  // Test 8: Missing required parameter
  console.log('\n8️⃣ Testing missing required parameter...');
  const missingParamResult = await testMCP('tools/call', {
    name: 'nvv_get_area_geometry',
    arguments: {}
  });
  const missingParamData = JSON.parse(missingParamResult.result?.content?.[0]?.text || '{}');
  if (missingParamResult.result?.isError || missingParamData.error) {
    console.log('   ✅ Correctly rejected missing parameter');
  } else {
    console.log('   ❌ Should have errored on missing parameter');
  }

  // Test 9: County lookup
  console.log('\n9️⃣ Testing county lookup...');
  const countyLookupResult = await testMCP('tools/call', {
    name: 'nvv_lookup_county',
    arguments: { query: 'Västra Götaland' }
  });
  const countyLookupData = JSON.parse(countyLookupResult.result?.content?.[0]?.text || '{}');
  console.log(countyLookupData.count > 0 ?
    `   ✅ Found county: ${countyLookupData.counties?.[0]?.name}` :
    '   ❌ Should find county');

  console.log('\n✨ Edge case tests complete!\n');
}

main().catch(console.error);
