export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>NVV MCP Server</h1>
      <p>
        MCP server wrapping the Naturvårdsverket (Swedish EPA) API for protected
        nature areas.
      </p>
      <h2>Available Tools</h2>
      <ul>
        <li>
          <strong>nvv_list_protected_areas</strong> - List protected areas by
          location
        </li>
        <li>
          <strong>nvv_get_area_geometry</strong> - Get WKT geometry for an area
        </li>
        <li>
          <strong>nvv_get_area_purposes</strong> - Get protection purposes
        </li>
        <li>
          <strong>nvv_get_area_land_cover</strong> - Get land cover
          classification
        </li>
        <li>
          <strong>nvv_get_area_environmental_goals</strong> - Get environmental
          goals
        </li>
        <li>
          <strong>nvv_get_area_regulations</strong> - Get regulation zones
        </li>
        <li>
          <strong>nvv_get_areas_extent</strong> - Get bounding box for areas
        </li>
        <li>
          <strong>nvv_lookup_municipality</strong> - Search municipality codes
        </li>
        <li>
          <strong>nvv_lookup_county</strong> - Search county codes
        </li>
      </ul>
      <h2>Usage</h2>
      <p>
        Connect to this MCP server using the MCP protocol. The server endpoint
        is available at <code>/sse</code> (SSE transport) or{" "}
        <code>/mcp</code> (HTTP transport).
      </p>
    </main>
  );
}
