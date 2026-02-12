import { createHttpClient } from '@/lib/http-client';
import { runWithConcurrency, NVV_API_CONCURRENCY } from '@/lib/concurrency';
import { extractBoundingBoxFromWkt, combineBoundingBoxes, boundingBoxToWkt, convertWktToWgs84 } from '@/lib/wkt-utils';
import {
  DEFAULT_DECISION_STATUS,
  type NvvArea,
  type NvvSyfte,
  type NvvNmdKlass,
  type NvvMiljomal,
  type NvvForeskriftsomrade,
  type NvvDocument,
  type ProtectedArea,
  type Purpose,
  type LandCover,
  type EnvironmentalGoal,
  type Regulation,
  type Document,
} from '@/types/nvv-api';

const NVV_API_BASE = 'https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3';

const client = createHttpClient({
  baseUrl: NVV_API_BASE,
  timeout: 30000,
});

/**
 * Transform raw NVV area to our clean format
 */
function transformArea(area: NvvArea): ProtectedArea {
  return {
    id: area.id,
    name: area.namn,
    type: area.skyddstyp,
    decision_status: area.beslutsstatus,
    area_ha: area.areaHa,
    land_area_ha: area.landareaHa,
    water_area_ha: area.vattenareaHa,
    forest_area_ha: area.skogAreaHa,
    decision_date: area.beslutsdatum,
    valid_date: area.gallandedatum,
    original_decision_date: area.ursprBeslutsdatum,
    regulation_effective_date: area.ikrafttradandedatumForeskrifter,
    county: area.lanAsText,
    municipalities: area.kommunerAsText,
    manager: area.forvaltare,
    decision_authority: area.beslutsmyndighet,
    supervisory_authority: area.tillsynsmyndighet,
    permit_authority: area.provningsmyndighetTillstand,
    exemption_authority: area.provningsmyndighetDispens,
    iucn_category: area.iucnKategori,
    decision_type: area.beslutstyp,
    description: area.beskrivning,
  };
}

export const nvvClient = {
  /**
   * Get a single area by ID
   * Endpoint: GET /omrade/{areaId}/{status}
   */
  async getArea(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<ProtectedArea> {
    const area = await client.request<NvvArea>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}`);
    return transformArea(area);
  },

  /**
   * List protected areas by location
   * Accepts kommun (municipality code), lan (county code), or namn (area name)
   * Endpoint: GET /omrade/nolinks
   */
  async listAreas(params: { kommun?: string; lan?: string; namn?: string; limit?: number }): Promise<ProtectedArea[]> {
    const areas = await client.request<NvvArea[]>('/omrade/nolinks', {
      params: {
        kommun: params.kommun,
        lan: params.lan,
        namn: params.namn,
        limit: params.limit ?? 100,
      },
    });
    return areas.map(transformArea);
  },

  /**
   * Get WKT geometry for an area (returned in WGS84)
   * Endpoint: GET /omrade/{areaId}/{status}/wkt
   */
  async getAreaWkt(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<string> {
    const wkt = await client.request<string>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/wkt`);
    return convertWktToWgs84(wkt);
  },

  /**
   * Get purposes for an area
   * Endpoint: GET /omrade/{areaId}/{status}/syften
   */
  async getAreaPurposes(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<Purpose[]> {
    const data = await client.request<NvvSyfte[]>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/syften`);
    return data.map((s) => ({
      name: s.namn,
      description: s.beskrivning,
    }));
  },

  /**
   * Get land cover classification
   * Endpoint: GET /omrade/{areaId}/{status}/nmdklasser
   */
  async getAreaLandCover(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<LandCover[]> {
    const data = await client.request<NvvNmdKlass[]>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/nmdklasser`);
    return data.map((n) => ({
      name: n.namn,
      code: n.kod,
      area_ha: n.areaHa,
    }));
  },

  /**
   * Get environmental goals
   * Endpoint: GET /omrade/{areaId}/{status}/miljomal
   */
  async getAreaEnvironmentalGoals(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<EnvironmentalGoal[]> {
    const data = await client.request<NvvMiljomal[]>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/miljomal`);
    return data.map((m) => ({ name: m.namn }));
  },

  /**
   * Get regulation zones
   * Endpoint: GET /omrade/{areaId}/{status}/foreskriftsomraden
   */
  async getAreaRegulations(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<Regulation[]> {
    const data = await client.request<NvvForeskriftsomrade[]>(
      `/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/foreskriftsomraden`,
    );
    return data.map((f) => ({
      type: f.foreskriftstyp,
      subtype: f.foreskriftssubtyp,
      area_ha: f.areaHa,
    }));
  },

  /**
   * Get decision documents (PDF links for decisions and management plans)
   * Endpoint: GET /omrade/{areaId}/{status}/beslutsdokument
   */
  async getAreaDocuments(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<Document[]> {
    const data = await client.request<NvvDocument[]>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/beslutsdokument`);
    return data.map((d) => ({
      id: d.id,
      name: d.namn,
      file_url: d.fileUrl,
      decision_type: d.beslutstyp,
      decision_authority: d.beslutsmyndighet,
      decision_date: d.beslutsdatum,
      valid_date: d.gallandedatum,
    }));
  },

  /**
   * Get bounding box for multiple areas (returned in WGS84)
   * Endpoint: GET /omrade/extentAsWkt
   *
   * WORKAROUND: The NVV API has a bug where calling this endpoint with multiple IDs
   * fails with Oracle error ORA-28579 (returns HTTP 500). We try the original API first,
   * and if it fails, we fall back to computing the extent client-side.
   */
  async getAreasExtent(areaIds: string[]): Promise<string> {
    // WORKAROUND: Try original API first (auto-heals when NVV fixes their bug)
    try {
      const result = await client.request<string>('/omrade/extentAsWkt', {
        params: { id: areaIds.join(',') },
      });

      // Check if response is valid WKT (starts with POLYGON)
      if (result.startsWith('POLYGON')) {
        return convertWktToWgs84(result);
      }

      // Response was not valid WKT, fall back to workaround
      throw new Error('Invalid WKT response');
    } catch {
      // WORKAROUND: NVV API bug detected (HTTP 500 or invalid response)
      // Fall back to computing extent client-side
      return this.computeExtentClientSide(areaIds);
    }
  },

  /**
   * WORKAROUND: Client-side extent calculation (returns WGS84)
   *
   * This method exists because the NVV API's /omrade/extentAsWkt endpoint
   * fails with Oracle error ORA-28579 when called with multiple area IDs.
   *
   * We fetch individual WKT geometries for each area, extract their bounding boxes,
   * and compute a combined bounding box.
   *
   * Note: getAreaWkt already returns WGS84 coordinates, so the bounding box
   * is computed in WGS84 space.
   *
   * TODO: Remove when NVV fixes their API. Test by calling:
   *   curl "https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3/omrade/extentAsWkt?id=2000019,2000140"
   * If it returns valid WKT instead of Oracle error, the bug is fixed.
   */
  async computeExtentClientSide(areaIds: string[]): Promise<string> {
    // Fetch WKT geometry for each area with limited concurrency to avoid 503s
    // Note: getAreaWkt already converts to WGS84
    const wktResults = await runWithConcurrency(
      areaIds.map((id) => () => this.getAreaWkt(id)),
      NVV_API_CONCURRENCY,
    );

    // Extract bounding box from each geometry (already in WGS84)
    const boundingBoxes = wktResults.map(extractBoundingBoxFromWkt);

    // Combine all bounding boxes into one
    const combinedBox = combineBoundingBoxes(boundingBoxes);

    // Convert back to WKT format (WGS84 coordinates)
    return boundingBoxToWkt(combinedBox);
  },
};
