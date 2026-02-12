import { z } from 'zod';
import { nvvClient } from '@/clients/nvv-client';
import { n2000Client } from '@/clients/n2000-client';
import { ramsarClient } from '@/clients/ramsar-client';
import { wfsClient, type WfsBboxArea } from '@/clients/wfs-client';
import { wgs84BboxToSweref99 } from '@/lib/coordinates';
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
  minLat: z
    .number()
    .optional()
    .describe('Bounding box south edge, WGS84 latitude (e.g., 59.30). Use bbox OR kommun/lan, not both.'),
  minLon: z.number().optional().describe('Bounding box west edge, WGS84 longitude (e.g., 18.00)'),
  maxLat: z.number().optional().describe('Bounding box north edge, WGS84 latitude (e.g., 59.40)'),
  maxLon: z.number().optional().describe('Bounding box east edge, WGS84 longitude (e.g., 18.10)'),
  limit: z.number().optional().describe('Max areas per source (1-500, default: 100)'),
};

export const searchTool = {
  name: 'nvv_search',
  description:
    'Search protected nature areas in Sweden. Two search modes: ' +
    '(1) By municipality/county code (kommun/lan) — searches national, Natura 2000, AND Ramsar areas. ' +
    '(2) By bounding box (minLat/minLon/maxLat/maxLon in WGS84) — searches national and Natura 2000 areas ' +
    '(Ramsar not available for bbox). Use nvv_lookup to convert place names to codes. ' +
    'Returns results tagged by source with an id field for use with nvv_detail. ' +
    'The same physical area may appear under multiple sources (e.g., both national and N2000) — ' +
    'these represent different legal protection schemes and are not duplicates.',
  inputSchema: searchInputSchema,
};

type SearchInput = {
  kommun?: string;
  lan?: string;
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  limit?: number;
};

type SourceError = {
  source: string;
  message: string;
};

export const searchHandler = withErrorHandling(async (args: SearchInput) => {
  const hasBbox =
    args.minLat !== undefined || args.minLon !== undefined || args.maxLat !== undefined || args.maxLon !== undefined;
  const hasKommun = !!args.kommun;
  const hasLan = !!args.lan;

  if (!hasBbox && !hasKommun && !hasLan) {
    throw new ValidationError('Provide kommun/lan codes OR bbox coordinates (minLat, minLon, maxLat, maxLon)');
  }

  if (hasBbox && (hasKommun || hasLan)) {
    throw new ValidationError('Provide either kommun/lan OR bbox coordinates, not both');
  }

  const limit = args.limit ?? 100;

  if (hasBbox) {
    return searchByBbox(args, limit);
  }

  return searchByKommunLan(args, limit);
});

async function searchByBbox(args: SearchInput, limit: number) {
  if (args.minLat === undefined || args.minLon === undefined || args.maxLat === undefined || args.maxLon === undefined) {
    throw new ValidationError('All four bbox parameters required: minLat, minLon, maxLat, maxLon');
  }

  // Convert once — validates bounds and produces SWEREF99TM bbox for WFS
  const swerefBbox = wgs84BboxToSweref99({
    minLat: args.minLat,
    minLon: args.minLon,
    maxLat: args.maxLat,
    maxLon: args.maxLon,
  });

  const [national, n2000] = await Promise.allSettled([
    wfsClient.searchNational(swerefBbox, limit),
    wfsClient.searchN2000(swerefBbox, limit),
  ]);

  const errors: SourceError[] = [];
  const areas: (WfsBboxArea & { source: string })[] = [];

  if (national.status === 'fulfilled') {
    for (const area of national.value) {
      areas.push({ source: 'national', ...area });
    }
  } else {
    errors.push({ source: 'national', message: national.reason?.message ?? 'Unknown error' });
  }

  if (n2000.status === 'fulfilled') {
    for (const area of n2000.value) {
      areas.push({ source: 'n2000', ...area });
    }
  } else {
    errors.push({ source: 'n2000', message: n2000.reason?.message ?? 'Unknown error' });
  }

  const nationalCount = national.status === 'fulfilled' ? national.value.length : 0;
  const n2000Count = n2000.status === 'fulfilled' ? n2000.value.length : 0;

  return {
    total_count: nationalCount + n2000Count,
    national_count: nationalCount,
    n2000_count: n2000Count,
    note: 'Bbox search covers national and Natura 2000 areas. Ramsar (international wetlands) requires kommun/lan codes.',
    errors,
    areas,
  };
}

async function searchByKommunLan(args: SearchInput, limit: number) {
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

  if (national.status === 'fulfilled') {
    for (const area of national.value) {
      areas.push({ source: 'national', ...area });
    }
  } else {
    errors.push({ source: 'national', message: national.reason?.message ?? 'Unknown error' });
  }

  if (n2000.status === 'fulfilled') {
    for (const area of n2000.value) {
      const { kod, ...rest } = area;
      areas.push({ source: 'n2000', id: kod, ...rest });
    }
  } else {
    errors.push({ source: 'n2000', message: n2000.reason?.message ?? 'Unknown error' });
  }

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
}
