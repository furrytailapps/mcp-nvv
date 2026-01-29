import { z } from 'zod';
import { n2000Client } from '@/clients/n2000-client';
import { withErrorHandling } from '@/lib/response';

/**
 * Types of N2000 area details that can be retrieved
 */
const INCLUDE_TYPES = ['species', 'habitats', 'land_cover', 'geometry', 'documents', 'all'] as const;

type IncludeType = (typeof INCLUDE_TYPES)[number];

export const n2000DetailInputSchema = {
  kod: z.string().describe("Natura 2000 area code from nvv_n2000_search (e.g., 'SE0110001')"),
  include: z
    .enum(INCLUDE_TYPES)
    .optional()
    .describe(
      'What to include: ' +
        'species (protected species in this area), ' +
        'habitats (EU habitat types), ' +
        'land_cover (NMD classification), ' +
        'geometry (WKT polygon), ' +
        'documents (PDF links), ' +
        'all (everything). Default: all',
    ),
};

export const n2000DetailTool = {
  name: 'nvv_n2000_detail',
  description:
    'Get detailed information about a Natura 2000 area including protected species and EU habitat types. ' +
    'Essential for Environmental Impact Assessments (EIA) - returns species data required for impact assessment ' +
    'and habitat types for Natura 2000-specific evaluation. ' +
    'Use include parameter to fetch specific data or all at once.',
  inputSchema: n2000DetailInputSchema,
};

type N2000DetailInput = {
  kod: string;
  include?: IncludeType;
};

export const n2000DetailHandler = withErrorHandling(async (args: N2000DetailInput) => {
  const { kod, include = 'all' } = args;

  // Get basic area info first
  const area = await n2000Client.getArea(kod);

  const result: Record<string, unknown> = {
    kod: area.kod,
    name: area.name,
    area_type: area.area_type,
    county: area.county,
    municipalities: area.municipalities,
    area_ha: area.area_ha,
    coordinate_system: 'EPSG:3006 (SWEREF99 TM)',
  };

  // Fetch all data types with limited concurrency (2 at a time)
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

  // Fetch single data type
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
});
