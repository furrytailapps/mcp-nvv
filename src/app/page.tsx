export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>NVV MCP Server</h1>
      <p>
        MCP server wrapping Naturvårdsverket (Swedish EPA) APIs for protected nature areas across three sources: national,
        Natura 2000, and Ramsar.
      </p>
      <h2>Available Tools</h2>
      <ul>
        <li>
          <strong>nvv_lookup</strong> - Look up Swedish municipality and county codes
        </li>
        <li>
          <strong>nvv_search</strong> - Search all protected areas across all sources
        </li>
        <li>
          <strong>nvv_detail</strong> - Get detailed info for a specific area
        </li>
        <li>
          <strong>nvv_extent</strong> - Calculate bounding box for multiple areas
        </li>
      </ul>
      <h2>Usage</h2>
      <p>
        Connect to this MCP server using the MCP protocol. The server endpoint is available at <code>/sse</code> (SSE transport)
        or <code>/mcp</code> (HTTP transport).
      </p>
    </main>
  );
}
