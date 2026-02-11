import { z } from 'zod';
import { nvvClient } from '@/clients/nvv-client';
import { n2000Client } from '@/clients/n2000-client';
import { ramsarClient } from '@/clients/ramsar-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { extractBoundingBoxFromWkt, combineBoundingBoxes, boundingBoxToWkt } from '@/lib/wkt-utils';

export const extentInputSchema = {
  nationalIds: z.array(z.string()).optional().describe('National area IDs, e.g. ["2000019", "2000140"]'),
  n2000Ids: z.array(z.string()).optional().describe('Natura 2000 area codes, e.g. ["SE0110001"]'),
  ramsarIds: z.array(z.string()).optional().describe('Ramsar area IDs, e.g. ["15"]'),
};

export const extentTool = {
  name: 'nvv_extent',
  description:
    'Calculate the combined bounding box for multiple protected areas across all sources. ' +
    'Pass IDs from nvv_search results grouped by source. ' +
    'At least one ID array must be non-empty. Max 100 total IDs. ' +
    'Returns a WKT POLYGON bounding box in WGS84.',
  inputSchema: extentInputSchema,
};

type ExtentInput = {
  nationalIds?: string[];
  n2000Ids?: string[];
  ramsarIds?: string[];
};

export const extentHandler = withErrorHandling(async (args: ExtentInput) => {
  const nationalIds = args.nationalIds ?? [];
  const n2000Ids = args.n2000Ids ?? [];
  const ramsarIds = args.ramsarIds ?? [];

  const totalCount = nationalIds.length + n2000Ids.length + ramsarIds.length;

  if (totalCount === 0) {
    throw new ValidationError('At least one ID array must be non-empty: nationalIds, n2000Ids, or ramsarIds');
  }

  if (totalCount > 100) {
    throw new ValidationError(`Too many IDs (${totalCount}). Maximum 100 total IDs across all sources.`);
  }

  // Fetch extents in parallel per source
  const extentPromises: Promise<string>[] = [];
  if (nationalIds.length > 0) extentPromises.push(nvvClient.getAreasExtent(nationalIds));
  if (n2000Ids.length > 0) extentPromises.push(n2000Client.getAreasExtent(n2000Ids));
  if (ramsarIds.length > 0) extentPromises.push(ramsarClient.getAreasExtent(ramsarIds));

  const extentWkts = await Promise.all(extentPromises);

  // If only one source, return its extent directly
  if (extentWkts.length === 1) {
    return {
      national_ids: nationalIds,
      n2000_ids: n2000Ids,
      ramsar_ids: ramsarIds,
      total_areas: totalCount,
      extent: extentWkts[0],
      coordinate_system: 'EPSG:4326 (WGS84)',
    };
  }

  // Combine bounding boxes from multiple sources
  const boundingBoxes = extentWkts.map(extractBoundingBoxFromWkt);
  const combined = combineBoundingBoxes(boundingBoxes);
  const combinedWkt = boundingBoxToWkt(combined);

  return {
    national_ids: nationalIds,
    n2000_ids: n2000Ids,
    ramsar_ids: ramsarIds,
    total_areas: totalCount,
    extent: combinedWkt,
    coordinate_system: 'EPSG:4326 (WGS84)',
  };
});
