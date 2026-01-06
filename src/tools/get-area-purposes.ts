import { z } from "zod";
import { nvvClient } from "@/clients/nvv-client";
import { withErrorHandling } from "@/lib/response";

export const getAreaPurposesInputSchema = {
  areaId: z.string()
    .min(1)
    .describe("The unique NVR area identifier"),
  status: z.string()
    .default("Gällande")
    .optional()
    .describe("Decision status. Default: 'Gällande'")
};

export const getAreaPurposesTool = {
  name: "nvv_get_area_purposes",
  description:
    "Get the protection purposes (syften) for a protected area. " +
    "Returns the official reasons and objectives for why the area is protected.",
  inputSchema: getAreaPurposesInputSchema
};

type GetAreaPurposesInput = {
  areaId: string;
  status?: string;
};

export const getAreaPurposesHandler = withErrorHandling(
  async (args: GetAreaPurposesInput) => {
    const { areaId, status } = args;
    const purposes = await nvvClient.getAreaPurposes(areaId, status ?? "Gällande");

    return {
      areaId,
      status: status ?? "Gällande",
      count: purposes.length,
      purposes
    };
  }
);
