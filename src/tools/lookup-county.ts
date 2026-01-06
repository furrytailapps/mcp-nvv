import { z } from "zod";
import { withErrorHandling } from "@/lib/response";
import type { County } from "@/types/nvv-api";
import lanData from "@/data/lan.json";

const lan = lanData as County[];

export const lookupCountyInputSchema = {
  query: z.string()
    .min(1)
    .describe("Search query - county name (partial match, case-insensitive)")
};

export const lookupCountyTool = {
  name: "nvv_lookup_county",
  description:
    "Search for Swedish county codes (länskoder). " +
    "Useful for finding the correct code to use with nvv_list_protected_areas. " +
    "Supports fuzzy search by county name.",
  inputSchema: lookupCountyInputSchema
};

type LookupCountyInput = {
  query: string;
};

export const lookupCountyHandler = withErrorHandling(
  async (args: LookupCountyInput) => {
    const { query } = args;
    const lowerQuery = query.toLowerCase();

    const matches = lan.filter(l =>
      l.name.toLowerCase().includes(lowerQuery)
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
      counties: matches
    };
  }
);
