import { z } from 'zod';
import { withErrorHandling } from '@/lib/response';
import { searchAndSort } from '@/lib/search-helpers';
import type { Municipality, County } from '@/types/nvv-api';
import kommunerData from '@/data/kommuner.json';
import lanData from '@/data/lan.json';

const kommuner = kommunerData as Municipality[];
const lan = lanData as County[];

/**
 * Lookup types
 */
const LOOKUP_TYPES = ['municipality', 'county'] as const;

type LookupType = (typeof LOOKUP_TYPES)[number];

export const lookupInputSchema = {
  type: z.enum(LOOKUP_TYPES).describe('Lookup type: municipality (kommun code) or county (län code)'),
  name: z.string().describe('Name to search for (partial match, case-insensitive)'),
};

export const lookupTool = {
  name: 'nvv_lookup',
  description:
    'Look up Swedish administrative codes. ' +
    "municipality: Returns 4-digit kommun codes (e.g., Stockholm -> '0180'). " +
    "county: Returns letter län codes (e.g., Stockholms län -> 'AB', Skåne -> 'M'). " +
    'Use codes with nvv_search.',
  inputSchema: lookupInputSchema,
};

type LookupInput = {
  type: LookupType;
  name: string;
};

export const lookupHandler = withErrorHandling(async (args: LookupInput) => {
  if (args.type === 'municipality') {
    const matches = searchAndSort(kommuner, args.name);
    return {
      type: args.type,
      query: args.name,
      count: matches.length,
      results: matches.slice(0, 20), // Max 20 results
    };
  } else {
    const matches = searchAndSort(lan, args.name);
    return {
      type: args.type,
      query: args.name,
      count: matches.length,
      results: matches,
    };
  }
});
