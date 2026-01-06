import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  listProtectedAreasTool,
  listProtectedAreasHandler
} from "./list-protected-areas";
import {
  getAreaGeometryTool,
  getAreaGeometryHandler
} from "./get-area-geometry";
import {
  getAreaPurposesTool,
  getAreaPurposesHandler
} from "./get-area-purposes";
import {
  getAreaLandCoverTool,
  getAreaLandCoverHandler
} from "./get-area-land-cover";
import {
  getAreaEnvironmentalGoalsTool,
  getAreaEnvironmentalGoalsHandler
} from "./get-area-env-goals";
import {
  getAreaRegulationsTool,
  getAreaRegulationsHandler
} from "./get-area-regulations";
import {
  getAreasExtentTool,
  getAreasExtentHandler
} from "./get-areas-extent";
import {
  lookupMunicipalityTool,
  lookupMunicipalityHandler
} from "./lookup-municipality";
import {
  lookupCountyTool,
  lookupCountyHandler
} from "./lookup-county";

const tools = [
  // NVV API wrapper tools
  { definition: listProtectedAreasTool, handler: listProtectedAreasHandler },
  { definition: getAreaGeometryTool, handler: getAreaGeometryHandler },
  { definition: getAreaPurposesTool, handler: getAreaPurposesHandler },
  { definition: getAreaLandCoverTool, handler: getAreaLandCoverHandler },
  { definition: getAreaEnvironmentalGoalsTool, handler: getAreaEnvironmentalGoalsHandler },
  { definition: getAreaRegulationsTool, handler: getAreaRegulationsHandler },
  { definition: getAreasExtentTool, handler: getAreasExtentHandler },
  // Lookup tools
  { definition: lookupMunicipalityTool, handler: lookupMunicipalityHandler },
  { definition: lookupCountyTool, handler: lookupCountyHandler },
];

/**
 * Register all NVV tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(
      definition.name,
      definition.description,
      definition.inputSchema,
      handler
    );
  }
}
