import { z } from 'zod';
import { nvvClient } from '@/clients/nvv-client';
import { n2000Client } from '@/clients/n2000-client';
import { ramsarClient } from '@/clients/ramsar-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { DEFAULT_DECISION_STATUS } from '@/types/nvv-api';

const SOURCES = ['national', 'n2000', 'ramsar'] as const;
type Source = (typeof SOURCES)[number];

const INCLUDE_TYPES = [
  'geometry',
  'land_cover',
  'documents',
  'purposes',
  'regulations',
  'env_goals',
  'species',
  'habitats',
  'all',
] as const;
type IncludeType = (typeof INCLUDE_TYPES)[number];

const NATIONAL_ONLY: IncludeType[] = ['purposes', 'regulations', 'env_goals'];
const N2000_ONLY: IncludeType[] = ['species', 'habitats'];
const RAMSAR_INCOMPATIBLE: IncludeType[] = ['documents', 'purposes', 'regulations', 'env_goals', 'species', 'habitats'];

export const detailInputSchema = {
  id: z.string().describe("Area identifier from nvv_search results (e.g., '2000019', 'SE0110001', '15')"),
  source: z.enum(SOURCES).describe("Source from nvv_search results: 'national', 'n2000', or 'ramsar'"),
  include: z
    .enum(INCLUDE_TYPES)
    .optional()
    .describe(
      'What to fetch. Default: all. ' +
        'National + N2000: geometry, land_cover, documents. ' +
        'Ramsar: geometry, land_cover. ' +
        'National only: purposes, regulations, env_goals. ' +
        'N2000 only: species, habitats.',
    ),
};

export const detailTool = {
  name: 'nvv_detail',
  description:
    'Get detailed information about a protected area. ' +
    'Pass the id and source from nvv_search results. ' +
    'Returns geometry, land cover, documents, and source-specific data ' +
    '(national: purposes, regulations, env_goals; N2000: species, habitats). ' +
    'Use include parameter to fetch specific data or all at once.',
  inputSchema: detailInputSchema,
};

type DetailInput = {
  id: string;
  source: Source;
  include?: IncludeType;
};

function validateIncludeForSource(include: IncludeType, source: Source): void {
  if (source === 'ramsar' && RAMSAR_INCOMPATIBLE.includes(include)) {
    throw new ValidationError(
      `'${include}' is not available for Ramsar areas. For Ramsar areas use: geometry, land_cover, all`,
    );
  }
  if (source !== 'national' && NATIONAL_ONLY.includes(include)) {
    const available =
      source === 'n2000' ? 'geometry, land_cover, documents, species, habitats, all' : 'geometry, land_cover, all';
    throw new ValidationError(`'${include}' is only available for national areas. ` + `For ${source} areas use: ${available}`);
  }
  if (source !== 'n2000' && N2000_ONLY.includes(include)) {
    const available =
      source === 'national'
        ? 'geometry, land_cover, documents, purposes, regulations, env_goals, all'
        : 'geometry, land_cover, all';
    throw new ValidationError(
      `'${include}' is only available for Natura 2000 areas. ` + `For ${source} areas use: ${available}`,
    );
  }
}

async function fetchNationalDetail(id: string, include: IncludeType) {
  const status = DEFAULT_DECISION_STATUS;
  const area = await nvvClient.getArea(id, status);
  const result: Record<string, unknown> = {
    id,
    source: 'national',
    name: area.name,
    type: area.type,
    county: area.county,
    municipalities: area.municipalities,
    area_ha: area.area_ha,
    coordinate_system: 'EPSG:4326 (WGS84)',
  };

  if (include === 'all') {
    // Batch 1: geometry + purposes
    const [geometry, purposes] = await Promise.all([nvvClient.getAreaWkt(id, status), nvvClient.getAreaPurposes(id, status)]);
    // Batch 2: land_cover + regulations
    const [land_cover, regulations] = await Promise.all([
      nvvClient.getAreaLandCover(id, status),
      nvvClient.getAreaRegulations(id, status),
    ]);
    // Batch 3: env_goals + documents
    const [env_goals, documents] = await Promise.all([
      nvvClient.getAreaEnvironmentalGoals(id, status),
      nvvClient.getAreaDocuments(id, status),
    ]);
    result.geometry = geometry;
    result.purposes = purposes;
    result.land_cover = land_cover;
    result.regulations = regulations;
    result.env_goals = env_goals;
    result.documents = documents;
    return result;
  }

  switch (include) {
    case 'geometry':
      result.geometry = await nvvClient.getAreaWkt(id, status);
      break;
    case 'purposes':
      result.purposes = await nvvClient.getAreaPurposes(id, status);
      break;
    case 'land_cover':
      result.land_cover = await nvvClient.getAreaLandCover(id, status);
      break;
    case 'regulations':
      result.regulations = await nvvClient.getAreaRegulations(id, status);
      break;
    case 'env_goals':
      result.env_goals = await nvvClient.getAreaEnvironmentalGoals(id, status);
      break;
    case 'documents':
      result.documents = await nvvClient.getAreaDocuments(id, status);
      break;
  }
  return result;
}

async function fetchN2000Detail(kod: string, include: IncludeType) {
  const area = await n2000Client.getArea(kod);
  const result: Record<string, unknown> = {
    id: area.kod,
    source: 'n2000',
    name: area.name,
    area_type: area.area_type,
    county: area.county,
    municipalities: area.municipalities,
    area_ha: area.area_ha,
    coordinate_system: 'EPSG:4326 (WGS84)',
  };

  if (include === 'all') {
    // Batch 1: species + habitats
    const [species, habitats] = await Promise.all([n2000Client.getAreaSpecies(kod), n2000Client.getAreaHabitats(kod)]);
    // Batch 2: land_cover + geometry
    const [land_cover, geometry] = await Promise.all([n2000Client.getAreaLandCover(kod), n2000Client.getAreaWkt(kod)]);
    // Batch 3: documents
    const documents = await n2000Client.getAreaDocuments(kod);
    result.species = species;
    result.habitats = habitats;
    result.land_cover = land_cover;
    result.geometry = geometry;
    result.documents = documents;
    return result;
  }

  switch (include) {
    case 'species':
      result.species = await n2000Client.getAreaSpecies(kod);
      break;
    case 'habitats':
      result.habitats = await n2000Client.getAreaHabitats(kod);
      break;
    case 'land_cover':
      result.land_cover = await n2000Client.getAreaLandCover(kod);
      break;
    case 'geometry':
      result.geometry = await n2000Client.getAreaWkt(kod);
      break;
    case 'documents':
      result.documents = await n2000Client.getAreaDocuments(kod);
      break;
  }
  return result;
}

async function fetchRamsarDetail(id: string, include: IncludeType) {
  const area = await ramsarClient.getArea(id);
  const result: Record<string, unknown> = {
    id: area.id,
    source: 'ramsar',
    name: area.name,
    protection_type: area.protection_type,
    county: area.county,
    municipalities: area.municipalities,
    total_area_ha: area.total_area_ha,
    coordinate_system: 'EPSG:4326 (WGS84)',
  };

  if (include === 'all') {
    // Batch: geometry + land_cover (Ramsar has no documents endpoint)
    const [geometry, land_cover] = await Promise.all([ramsarClient.getAreaWkt(id), ramsarClient.getAreaLandCover(id)]);
    result.geometry = geometry;
    result.land_cover = land_cover;
    return result;
  }

  switch (include) {
    case 'geometry':
      result.geometry = await ramsarClient.getAreaWkt(id);
      break;
    case 'land_cover':
      result.land_cover = await ramsarClient.getAreaLandCover(id);
      break;
  }
  return result;
}

export const detailHandler = withErrorHandling(async (args: DetailInput) => {
  const { id, source, include = 'all' } = args;

  validateIncludeForSource(include, source);

  switch (source) {
    case 'national':
      return fetchNationalDetail(id, include);
    case 'n2000':
      return fetchN2000Detail(id, include);
    case 'ramsar':
      return fetchRamsarDetail(id, include);
  }
});
