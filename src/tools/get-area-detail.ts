import { z } from 'zod';
import { nvvClient } from '@/clients/nvv-client';
import { withErrorHandling } from '@/lib/response';
import { DEFAULT_DECISION_STATUS } from '@/types/nvv-api';

/**
 * Types of area details that can be retrieved
 */
const INCLUDE_TYPES = ['geometry', 'purposes', 'land_cover', 'regulations', 'env_goals', 'documents', 'all'] as const;

type IncludeType = (typeof INCLUDE_TYPES)[number];

export const getAreaDetailInputSchema = {
  areaId: z.string().describe("Area ID from nvv_list_protected_areas (e.g., '2000019')"),
  status: z.string().optional().describe("Decision status: 'Gällande' (default), 'Överklagat', 'Beslutat'"),
  include: z
    .enum(INCLUDE_TYPES)
    .optional()
    .describe(
      'What to include: ' +
        'geometry (WKT polygon), ' +
        'purposes (protection reasons), ' +
        'land_cover (NMD classification), ' +
        'regulations (föreskrifter), ' +
        'env_goals (miljömål), ' +
        'documents (PDF links), ' +
        'all (everything). Default: all',
    ),
};

export const getAreaDetailTool = {
  name: 'nvv_get_area_detail',
  description:
    'Get detailed information about a protected nature area. ' +
    'Returns geometry, protection purposes, land cover, regulations, environmental goals, and documents. ' +
    'Use include parameter to fetch specific data or all at once.',
  inputSchema: getAreaDetailInputSchema,
};

type GetAreaDetailInput = {
  areaId: string;
  status?: string;
  include?: IncludeType;
};

export const getAreaDetailHandler = withErrorHandling(async (args: GetAreaDetailInput) => {
  const { areaId, status = DEFAULT_DECISION_STATUS, include = 'all' } = args;

  const result: Record<string, unknown> = {
    areaId,
    status,
    coordinate_system: 'EPSG:3006 (SWEREF99 TM)',
  };

  // Fetch all data types with limited concurrency (2 at a time) to avoid overwhelming upstream API
  if (include === 'all') {
    // Batch 1: geometry + purposes
    const [geometry, purposes] = await Promise.all([
      nvvClient.getAreaWkt(areaId, status),
      nvvClient.getAreaPurposes(areaId, status),
    ]);
    // Batch 2: land_cover + regulations
    const [land_cover, regulations] = await Promise.all([
      nvvClient.getAreaLandCover(areaId, status),
      nvvClient.getAreaRegulations(areaId, status),
    ]);
    // Batch 3: env_goals + documents
    const [env_goals, documents] = await Promise.all([
      nvvClient.getAreaEnvironmentalGoals(areaId, status),
      nvvClient.getAreaDocuments(areaId, status),
    ]);

    result.geometry = geometry;
    result.purposes = purposes;
    result.land_cover = land_cover;
    result.regulations = regulations;
    result.env_goals = env_goals;
    result.documents = documents;
    return result;
  }

  // Fetch single data type
  switch (include) {
    case 'geometry':
      result.geometry = await nvvClient.getAreaWkt(areaId, status);
      break;
    case 'purposes':
      result.purposes = await nvvClient.getAreaPurposes(areaId, status);
      break;
    case 'land_cover':
      result.land_cover = await nvvClient.getAreaLandCover(areaId, status);
      break;
    case 'regulations':
      result.regulations = await nvvClient.getAreaRegulations(areaId, status);
      break;
    case 'env_goals':
      result.env_goals = await nvvClient.getAreaEnvironmentalGoals(areaId, status);
      break;
    case 'documents':
      result.documents = await nvvClient.getAreaDocuments(areaId, status);
      break;
  }

  return result;
});
