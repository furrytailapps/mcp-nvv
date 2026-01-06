import { z } from "zod";
import { nvvClient } from "@/clients/nvv-client";
import { withErrorHandling } from "@/lib/response";

export const getAreaGeometryInputSchema = {
  areaId: z.string()
    .min(1)
    .describe("The unique NVR area identifier (from list_protected_areas)"),
  status: z.string()
    .default("Gällande")
    .optional()
    .describe("Decision status: 'Gällande' (valid/active), 'Överklagat' (under appeal), or 'Beslutat' (decided). Default: 'Gällande'")
};

export const getAreaGeometryTool = {
  name: "nvv_get_area_geometry",
  description:
    "Get the WKT (Well-Known Text) geometry for a specific protected area. " +
    "Returns polygon/multipolygon data suitable for GIS applications or map rendering. " +
    "The geometry is in SWEREF99 TM (EPSG:3006) coordinate system.",
  inputSchema: getAreaGeometryInputSchema
};

type GetAreaGeometryInput = {
  areaId: string;
  status?: string;
};

export const getAreaGeometryHandler = withErrorHandling(
  async (args: GetAreaGeometryInput) => {
    const { areaId, status } = args;
    const geometry = await nvvClient.getAreaWkt(areaId, status ?? "Gällande");

    return {
      areaId,
      status: status ?? "Gällande",
      geometry,
      coordinate_system: "EPSG:3006 (SWEREF99 TM)"
    };
  }
);
