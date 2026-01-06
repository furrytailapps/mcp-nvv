import { z } from "zod";
import { nvvClient } from "@/clients/nvv-client";
import { withErrorHandling } from "@/lib/response";

export const getAreasExtentInputSchema = {
  areaIds: z.array(z.string())
    .min(1)
    .max(100)
    .describe("Array of NVR area identifiers to calculate extent for (1-100 IDs)")
};

export const getAreasExtentTool = {
  name: "nvv_get_areas_extent",
  description:
    "Calculate the combined bounding box (extent) for multiple protected areas as WKT. " +
    "Useful for determining the geographic extent to display on a map.",
  inputSchema: getAreasExtentInputSchema
};

type GetAreasExtentInput = {
  areaIds: string[];
};

export const getAreasExtentHandler = withErrorHandling(
  async (args: GetAreasExtentInput) => {
    const { areaIds } = args;
    const extent = await nvvClient.getAreasExtent(areaIds);

    return {
      area_ids: areaIds,
      count: areaIds.length,
      extent,
      coordinate_system: "EPSG:3006 (SWEREF99 TM)"
    };
  }
);
