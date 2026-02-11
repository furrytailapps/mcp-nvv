import { z } from 'zod';
import { nvvClient } from '@/clients/nvv-client';
import { n2000Client } from '@/clients/n2000-client';
import { ramsarClient } from '@/clients/ramsar-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';

export const searchInputSchema = {
  kommun: z
    .string()
    .optional()
    .describe("Swedish municipality code (4 digits, e.g., '0180' for Stockholm). " + 'Use nvv_lookup to find codes.'),
  lan: z
    .string()
    .optional()
    .describe(
      "Swedish county code (1-2 letters, e.g., 'AB' for Stockholms lan, 'M' for Skane). " + 'Use nvv_lookup to find codes.',
    ),
  limit: z.number().optional().describe('Max areas per source (1-500, default: 100)'),
};

export const searchTool = {
  name: 'nvv_search',
  description:
    'Search ALL protected nature areas in Sweden across three sources simultaneously: ' +
    'national (nature reserves, national parks), Natura 2000 (EU protected), and Ramsar (international wetlands). ' +
    'Always queries all three sources — no need to search separately. ' +
    'Search by municipality code (kommun) or county code (lan). At least one is required. ' +
    'Use nvv_lookup to convert place names to codes. ' +
    'Returns combined results tagged by source with an id field for use with nvv_detail.',
  inputSchema: searchInputSchema,
};

type SearchInput = {
  kommun?: string;
  lan?: string;
  limit?: number;
};

type SourceError = {
  source: string;
  message: string;
};

export const searchHandler = withErrorHandling(async (args: SearchInput) => {
  if (!args.kommun && !args.lan) {
    throw new ValidationError('At least one search parameter must be provided: kommun or lan');
  }

  const limit = args.limit ?? 100;
  const searchParams = {
    kommun: args.kommun || undefined,
    lan: args.lan || undefined,
    limit,
  };

  const [national, n2000, ramsar] = await Promise.allSettled([
    nvvClient.listAreas(searchParams),
    n2000Client.listAreas(searchParams),
    ramsarClient.listAreas(searchParams),
  ]);

  const errors: SourceError[] = [];
  const areas: Record<string, unknown>[] = [];

  // National areas
  if (national.status === 'fulfilled') {
    for (const area of national.value) {
      areas.push({ source: 'national', ...area });
    }
  } else {
    errors.push({ source: 'national', message: national.reason?.message ?? 'Unknown error' });
  }

  // N2000 areas — map `kod` to `id` for consistent interface
  if (n2000.status === 'fulfilled') {
    for (const area of n2000.value) {
      const { kod, ...rest } = area;
      areas.push({ source: 'n2000', id: kod, ...rest });
    }
  } else {
    errors.push({ source: 'n2000', message: n2000.reason?.message ?? 'Unknown error' });
  }

  // Ramsar areas
  if (ramsar.status === 'fulfilled') {
    for (const area of ramsar.value) {
      areas.push({ source: 'ramsar', ...area });
    }
  } else {
    errors.push({ source: 'ramsar', message: ramsar.reason?.message ?? 'Unknown error' });
  }

  const nationalCount = national.status === 'fulfilled' ? national.value.length : 0;
  const n2000Count = n2000.status === 'fulfilled' ? n2000.value.length : 0;
  const ramsarCount = ramsar.status === 'fulfilled' ? ramsar.value.length : 0;

  return {
    total_count: nationalCount + n2000Count + ramsarCount,
    national_count: nationalCount,
    n2000_count: n2000Count,
    ramsar_count: ramsarCount,
    errors,
    areas,
  };
});
