import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { lookupTool, lookupHandler } from './lookup';
import { searchTool, searchHandler } from './search';
import { detailTool, detailHandler } from './detail';
import { extentTool, extentHandler } from './extent';

const tools = [
  { definition: lookupTool, handler: lookupHandler },
  { definition: searchTool, handler: searchHandler },
  { definition: detailTool, handler: detailHandler },
  { definition: extentTool, handler: extentHandler },
];

export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
