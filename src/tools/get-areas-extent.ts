import { z } from 'zod';
import { nvvClient } from '@/clients/nvv-client';
import { withErrorHandling } from '@/lib/response';

export const getAreasExtentInputSchema = {
  areaIds: z.array(z.string()).min(1).max(100).describe('Array of area IDs (1-100). Example: ["2000019", "2000140"]'),
};

export const getAreasExtentTool = {
  name: 'nvv_get_areas_extent',
  description:
    'Calculate the combined bounding box (extent) for multiple protected areas as WKT. ' +
    'Useful for determining the geographic extent to display on a map. ' +
    'Note: May take 1-2 seconds due to upstream API limitations.',
  inputSchema: getAreasExtentInputSchema,
};

type GetAreasExtentInput = {
  areaIds: string[];
};

export const getAreasExtentHandler = withErrorHandling(async (args: GetAreasExtentInput) => {
  const extent = await nvvClient.getAreasExtent(args.areaIds);

  return {
    area_ids: args.areaIds,
    count: args.areaIds.length,
    extent,
    coordinate_system: 'EPSG:3006 (SWEREF99 TM)',
  };
});
