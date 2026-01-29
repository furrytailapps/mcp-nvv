import { z } from 'zod';
import { n2000Client } from '@/clients/n2000-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';

export const n2000SearchInputSchema = {
  kommun: z.string().optional().describe("Swedish municipality code (4 digits, e.g., '0180' for Stockholm)"),
  lan: z.string().optional().describe("Swedish county code (1-2 letters, e.g., 'AB' for Stockholms län, 'W' for Dalarna)"),
  namn: z.string().optional().describe('Search by area name (partial match supported)'),
  artnamn: z.string().optional().describe("Filter by species name (e.g., 'varg' for wolf, 'kungsörn' for golden eagle)"),
  naturtypkod: z
    .string()
    .optional()
    .describe("Filter by EU habitat type code (e.g., '9010' for old-growth coniferous forest, '7140' for mires)"),
  limit: z.number().optional().describe('Max areas to return (1-500, default: 100)'),
};

export const n2000SearchTool = {
  name: 'nvv_n2000_search',
  description:
    'Search Natura 2000 protected areas in Sweden. ' +
    'Natura 2000 is the EU network of protected areas under the Birds and Habitats Directives. ' +
    'Areas are classified as SPA (birds), SCI (habitats), or both. ' +
    'Search by location (kommun/län), name, species, or habitat type. ' +
    'Useful for Environmental Impact Assessments (EIA) to identify EU-protected areas. ' +
    'At least one search parameter is required.',
  inputSchema: n2000SearchInputSchema,
};

type N2000SearchInput = {
  kommun?: string;
  lan?: string;
  namn?: string;
  artnamn?: string;
  naturtypkod?: string;
  limit?: number;
};

export const n2000SearchHandler = withErrorHandling(async (args: N2000SearchInput) => {
  // Validate at least one search parameter is provided
  if (!args.kommun && !args.lan && !args.namn && !args.artnamn && !args.naturtypkod) {
    throw new ValidationError('At least one search parameter must be provided: kommun, lan, namn, artnamn, or naturtypkod');
  }

  const areas = await n2000Client.listAreas(args);

  return {
    count: areas.length,
    areas,
  };
});
