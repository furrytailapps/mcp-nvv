import { z } from "zod";
import { nvvClient } from "@/clients/nvv-client";
import { withErrorHandling } from "@/lib/response";

export const getAreaEnvironmentalGoalsInputSchema = {
  areaId: z.string()
    .min(1)
    .describe("The unique NVR area identifier"),
  status: z.string()
    .default("Gällande")
    .optional()
    .describe("Decision status. Default: 'Gällande'")
};

export const getAreaEnvironmentalGoalsTool = {
  name: "nvv_get_area_environmental_goals",
  description:
    "Get the Swedish environmental quality goals (miljömål) associated with a protected area. " +
    "Returns which of Sweden's 16 environmental objectives the area contributes to.",
  inputSchema: getAreaEnvironmentalGoalsInputSchema
};

type GetAreaEnvironmentalGoalsInput = {
  areaId: string;
  status?: string;
};

export const getAreaEnvironmentalGoalsHandler = withErrorHandling(
  async (args: GetAreaEnvironmentalGoalsInput) => {
    const { areaId, status } = args;
    const goals = await nvvClient.getAreaEnvironmentalGoals(areaId, status ?? "Gällande");

    return {
      areaId,
      status: status ?? "Gällande",
      count: goals.length,
      environmental_goals: goals
    };
  }
);
