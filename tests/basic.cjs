// Simple test script for the NVV MCP server
const http = require('http');

function parseSSE(sseText) {
  // Parse Server-Sent Events format
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
        // Try to parse as SSE first
        const parsed = parseSSE(body);
        if (parsed) {
          resolve(parsed);
          return;
        }

        // Try as plain JSON
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
  console.log('🧪 Testing NVV MCP Server\n');

  // Test 1: Initialize
  console.log('1️⃣ Testing initialization...');
  const initResult = await testMCP('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });
  console.log('   ✅ Initialize:', initResult.result ? 'OK' : 'FAILED');
  if (initResult.result?.serverInfo) {
    console.log(`   📦 Server: ${initResult.result.serverInfo.name}`);
  }

  // Test 2: List tools
  console.log('\n2️⃣ Listing available tools...');
  const toolsResult = await testMCP('tools/list');
  if (toolsResult.result?.tools) {
    console.log(`   ✅ Found ${toolsResult.result.tools.length} tools:`);
    toolsResult.result.tools.forEach(t => console.log(`      - ${t.name}`));
  } else {
    console.log('   ❌ Failed to list tools');
  }

  // Test 3: Call lookup municipality tool
  console.log('\n3️⃣ Testing nvv_lookup_municipality with "Stockholm"...');
  const lookupResult = await testMCP('tools/call', {
    name: 'nvv_lookup_municipality',
    arguments: { query: 'Stockholm' }
  });

  if (lookupResult.result?.content?.[0]?.text) {
    const data = JSON.parse(lookupResult.result.content[0].text);
    console.log(`   ✅ Found ${data.count} municipalities`);
    if (data.municipalities?.length > 0) {
      console.log(`   📍 First result: ${data.municipalities[0].name} (${data.municipalities[0].code})`);
    }
  } else {
    console.log('   ❌ Failed:', lookupResult.error?.message || 'Unknown error');
  }

  // Test 4: Call NVV API (list protected areas in Stockholm)
  console.log('\n4️⃣ Testing nvv_list_protected_areas for Stockholm (kommun=0180)...');
  const areasResult = await testMCP('tools/call', {
    name: 'nvv_list_protected_areas',
    arguments: { kommun: '0180', limit: 5 }
  });

  if (areasResult.result?.content?.[0]?.text) {
    const data = JSON.parse(areasResult.result.content[0].text);
    console.log(`   ✅ Found ${data.count} protected areas`);
    if (data.areas?.length > 0) {
      console.log(`   🌲 Example: ${data.areas[0].name} (${data.areas[0].type})`);
    }
  } else {
    console.log('   ❌ Failed:', areasResult.error?.message || 'Unknown error');
  }

  console.log('\n✨ Tests complete!\n');
}

main().catch(console.error);
