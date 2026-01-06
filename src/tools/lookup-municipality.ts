import { z } from "zod";
import { withErrorHandling } from "@/lib/response";
import type { Municipality } from "@/types/nvv-api";
import kommunerData from "@/data/kommuner.json";

const kommuner = kommunerData as Municipality[];

export const lookupMunicipalityInputSchema = {
  query: z.string()
    .min(1)
    .describe("Search query - municipality name (partial match, case-insensitive)")
};

export const lookupMunicipalityTool = {
  name: "nvv_lookup_municipality",
  description:
    "Search for Swedish municipality codes (kommunkoder). " +
    "Useful for finding the correct code to use with nvv_list_protected_areas. " +
    "Supports fuzzy search by municipality name.",
  inputSchema: lookupMunicipalityInputSchema
};

type LookupMunicipalityInput = {
  query: string;
};

export const lookupMunicipalityHandler = withErrorHandling(
  async (args: LookupMunicipalityInput) => {
    const { query } = args;
    const lowerQuery = query.toLowerCase();

    const matches = kommuner.filter(k =>
      k.name.toLowerCase().includes(lowerQuery)
    );

    // Sort by relevance - exact matches first, then by name
    matches.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name, "sv");
    });

    return {
      query,
      count: matches.length,
      municipalities: matches.slice(0, 20) // Return max 20 results
    };
  }
);
