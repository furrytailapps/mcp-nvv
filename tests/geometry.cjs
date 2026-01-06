// Debug geometry endpoint
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
  console.log('Testing nvv_get_area_geometry...\n');

  const result = await testMCP('tools/call', {
    name: 'nvv_get_area_geometry',
    arguments: { areaId: '2000019' }
  });

  console.log('Full response:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n\nTesting nvv_get_areas_extent...\n');

  const extentResult = await testMCP('tools/call', {
    name: 'nvv_get_areas_extent',
    arguments: { areaIds: ['2000019'] }
  });

  console.log('Full response:');
  console.log(JSON.stringify(extentResult, null, 2));
}

main().catch(console.error);
