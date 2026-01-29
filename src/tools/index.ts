import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Naturvardsregistret tools (national protected areas)
import { listProtectedAreasTool, listProtectedAreasHandler } from './list-protected-areas';
import { getAreaDetailTool, getAreaDetailHandler } from './get-area-detail';
import { lookupTool, lookupHandler } from './lookup';
import { getAreasExtentTool, getAreasExtentHandler } from './get-areas-extent';

// Natura 2000 tools (EU protected areas)
import { n2000SearchTool, n2000SearchHandler } from './n2000-search';
import { n2000DetailTool, n2000DetailHandler } from './n2000-detail';

// Ramsar tools (international wetland convention)
import { ramsarSearchTool, ramsarSearchHandler } from './ramsar-search';

// Tool registry: 4 original + 3 new = 7 tools
const tools = [
  // Naturvardsregistret (national)
  { definition: listProtectedAreasTool, handler: listProtectedAreasHandler },
  { definition: getAreaDetailTool, handler: getAreaDetailHandler },
  { definition: lookupTool, handler: lookupHandler },
  { definition: getAreasExtentTool, handler: getAreasExtentHandler },
  // Natura 2000 (EU)
  { definition: n2000SearchTool, handler: n2000SearchHandler },
  { definition: n2000DetailTool, handler: n2000DetailHandler },
  // Ramsar (international)
  { definition: ramsarSearchTool, handler: ramsarSearchHandler },
];

/**
 * Register all NVV tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
