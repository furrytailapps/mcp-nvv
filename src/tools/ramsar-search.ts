import { z } from 'zod';
import { ramsarClient } from '@/clients/ramsar-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';

export const ramsarSearchInputSchema = {
  kommun: z.string().optional().describe("Swedish municipality code (4 digits, e.g., '0180' for Stockholm)"),
  lan: z.string().optional().describe("Swedish county code (1-2 letters, e.g., 'AB' for Stockholms län)"),
  namn: z.string().optional().describe('Search by wetland name (partial match supported)'),
  limit: z.number().optional().describe('Max areas to return (1-100, default: 50)'),
};

export const ramsarSearchTool = {
  name: 'nvv_ramsar_search',
  description:
    'Search Ramsar wetland sites in Sweden (~68 sites total). ' +
    'Ramsar is an international treaty for wetland conservation. ' +
    'These sites have international protection status beyond Swedish national law. ' +
    'Important for construction projects that may affect water levels, drainage, or water quality. ' +
    'Search by location (kommun/län) or wetland name. ' +
    'At least one search parameter is required.',
  inputSchema: ramsarSearchInputSchema,
};

type RamsarSearchInput = {
  kommun?: string;
  lan?: string;
  namn?: string;
  limit?: number;
};

export const ramsarSearchHandler = withErrorHandling(async (args: RamsarSearchInput) => {
  // Validate at least one search parameter is provided
  if (!args.kommun && !args.lan && !args.namn) {
    throw new ValidationError('At least one search parameter must be provided: kommun, lan, or namn');
  }

  const areas = await ramsarClient.listAreas({
    kommun: args.kommun,
    lan: args.lan,
    namn: args.namn,
    limit: args.limit ?? 50,
  });

  return {
    count: areas.length,
    areas,
  };
});
