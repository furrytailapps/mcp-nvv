import { createHttpClient } from '@/lib/http-client';
import { runWithConcurrency, NVV_API_CONCURRENCY } from '@/lib/concurrency';
import { extractBoundingBoxFromWkt, combineBoundingBoxes, boundingBoxToWkt } from '@/lib/wkt-utils';
import {
  type RamsarRawArea,
  type RamsarRawNmdKlass,
  type RamsarRawProtectionType,
  type RamsarArea,
  type RamsarLandCover,
  type RamsarProtectionType,
} from '@/types/ramsar-api';

const RAMSAR_API_BASE = 'https://geodata.naturvardsverket.se/internationellakonventioner/rest/v3';

const client = createHttpClient({
  baseUrl: RAMSAR_API_BASE,
  timeout: 30000,
});

/**
 * Transform raw Ramsar area to clean format
 */
function transformArea(area: RamsarRawArea): RamsarArea {
  return {
    id: area.id,
    name: area.namn,
    protection_type: area.skyddstyp,
    nation: area.nation,
    county: area.lanAsText,
    municipalities: area.kommunerAsText,
    total_area_ha: area.totalArealHA,
    shape_area_ha: area.shapeAreaHA,
    land_area_ha: area.landHA,
    forest_area_ha: area.skogHA,
    water_area_ha: area.vattenHA,
    original_decision: area.ursprungligtBeslut,
    latest_decision: area.senastBeslut,
    legal_act: area.legalAct,
  };
}

/**
 * Transform raw land cover to clean format
 */
function transformLandCover(nmd: RamsarRawNmdKlass): RamsarLandCover {
  return {
    ramsar_id: nmd.ramsarId,
    code: nmd.kod,
    name: nmd.namn,
    area_ha: nmd.areaHa,
  };
}

/**
 * Transform raw protection type to clean format
 */
function transformProtectionType(type: RamsarRawProtectionType): RamsarProtectionType {
  return {
    key: type.key,
    value: type.value,
  };
}

export const ramsarClient = {
  /**
   * List Ramsar wetland areas
   * Endpoint: GET /ramsar/nolinks
   */
  async listAreas(params: {
    kommun?: string;
    lan?: string;
    namn?: string;
    id?: string;
    limit?: number;
  }): Promise<RamsarArea[]> {
    const areas = await client.request<RamsarRawArea[]>('/ramsar/nolinks', {
      params: {
        kommun: params.kommun,
        lan: params.lan,
        namn: params.namn,
        id: params.id,
        limit: params.limit ?? 100,
      },
    });
    return areas.map(transformArea);
  },

  /**
   * Get single Ramsar area by ID
   * Endpoint: GET /ramsar/{id}
   */
  async getArea(id: string): Promise<RamsarArea> {
    const area = await client.request<RamsarRawArea>(`/ramsar/${encodeURIComponent(id)}`);
    return transformArea(area);
  },

  /**
   * Get WKT geometry for a Ramsar area
   * Endpoint: GET /ramsar/{id}/wkt
   */
  async getAreaWkt(id: string): Promise<string> {
    return client.request<string>(`/ramsar/${encodeURIComponent(id)}/wkt`);
  },

  /**
   * Get land cover (NMD classes) for a Ramsar area
   * Endpoint: GET /ramsar/{id}/nmdklasser
   */
  async getAreaLandCover(id: string): Promise<RamsarLandCover[]> {
    const nmd = await client.request<RamsarRawNmdKlass[]>(`/ramsar/${encodeURIComponent(id)}/nmdklasser`);
    return nmd.map(transformLandCover);
  },

  /**
   * Get available protection types
   * Endpoint: GET /ramsar/skyddstyper/list
   */
  async getProtectionTypes(): Promise<RamsarProtectionType[]> {
    const types = await client.request<RamsarRawProtectionType[]>('/ramsar/skyddstyper/list');
    return types.map(transformProtectionType);
  },

  /**
   * Get bounding box for multiple areas
   */
  async getAreasExtent(ids: string[]): Promise<string> {
    try {
      const result = await client.request<string>('/ramsar/extentAsWkt', {
        params: { id: ids.join(',') },
      });

      if (result.startsWith('POLYGON')) {
        return result;
      }

      throw new Error('Invalid WKT response');
    } catch {
      // Fallback to client-side computation
      return this.computeExtentClientSide(ids);
    }
  },

  /**
   * Client-side extent calculation fallback
   */
  async computeExtentClientSide(ids: string[]): Promise<string> {
    const wktResults = await runWithConcurrency(
      ids.map((id) => () => this.getAreaWkt(id)),
      NVV_API_CONCURRENCY,
    );

    const boundingBoxes = wktResults.map(extractBoundingBoxFromWkt);
    const combinedBox = combineBoundingBoxes(boundingBoxes);
    return boundingBoxToWkt(combinedBox);
  },
};
