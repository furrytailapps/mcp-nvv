import { z } from "zod";
import { nvvClient } from "@/clients/nvv-client";
import { withErrorHandling } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

export const listProtectedAreasInputSchema = {
  kommun: z.string()
    .optional()
    .describe("Swedish municipality code (4 digits, e.g., '0180' for Stockholm)"),
  lan: z.string()
    .optional()
    .describe("Swedish county code (2 digits, e.g., '01' for Stockholms län)"),
  namn: z.string()
    .optional()
    .describe("Search by area name (partial match supported)"),
  limit: z.number()
    .int()
    .min(1)
    .max(500)
    .default(100)
    .optional()
    .describe("Maximum number of areas to return (1-500, default: 100)")
};

export const listProtectedAreasTool = {
  name: "nvv_list_protected_areas",
  description:
    "List protected nature areas (skyddade områden) in Sweden. " +
    "You can search by municipality code (kommun), county code (län), or area name (namn). " +
    "At least one of these parameters must be provided. " +
    "Returns basic metadata for each area including ID, name, type, status, and area measurements.",
  inputSchema: listProtectedAreasInputSchema
};

type ListProtectedAreasInput = {
  kommun?: string;
  lan?: string;
  namn?: string;
  limit?: number;
};

export const listProtectedAreasHandler = withErrorHandling(
  async (args: ListProtectedAreasInput) => {
    const { kommun, lan, namn, limit } = args;

    // Validate at least one search parameter is provided
    if (!kommun && !lan && !namn) {
      throw new ValidationError(
        "At least one search parameter must be provided: kommun, lan, or namn"
      );
    }

    const areas = await nvvClient.listAreas({
      kommun,
      lan,
      namn,
      limit: limit ?? 100
    });

    return {
      count: areas.length,
      areas
    };
  }
);
