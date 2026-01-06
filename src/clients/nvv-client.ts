import { createHttpClient } from "@/lib/http-client";
import type {
  NvvArea,
  NvvSyfte,
  NvvNmdKlass,
  NvvMiljomal,
  NvvForeskriftsomrade,
  ProtectedArea,
  Purpose,
  LandCover,
  EnvironmentalGoal,
  Regulation
} from "@/types/nvv-api";

const NVV_API_BASE = "https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3";

const client = createHttpClient({
  baseUrl: NVV_API_BASE,
  timeout: 30000
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
    description: area.beskrivning
  };
}

export const nvvClient = {
  /**
   * List protected areas by location
   * Accepts kommun (municipality code), lan (county code), or namn (area name)
   * Endpoint: GET /omrade/nolinks
   */
  async listAreas(params: {
    kommun?: string;
    lan?: string;
    namn?: string;
    limit?: number;
  }): Promise<ProtectedArea[]> {
    const areas = await client.request<NvvArea[]>("/omrade/nolinks", {
      params: {
        kommun: params.kommun,
        lan: params.lan,
        namn: params.namn,
        limit: params.limit ?? 100
      }
    });
    return areas.map(transformArea);
  },

  /**
   * Get WKT geometry for an area
   * Endpoint: GET /omrade/{areaId}/{status}/wkt
   */
  async getAreaWkt(areaId: string, status: string = "Gällande"): Promise<string> {
    const encodedStatus = encodeURIComponent(status);
    return client.request<string>(`/omrade/${areaId}/${encodedStatus}/wkt`);
  },

  /**
   * Get purposes for an area
   * Endpoint: GET /omrade/{areaId}/{status}/syften
   */
  async getAreaPurposes(areaId: string, status: string = "Gällande"): Promise<Purpose[]> {
    const encodedStatus = encodeURIComponent(status);
    const data = await client.request<NvvSyfte[]>(`/omrade/${areaId}/${encodedStatus}/syften`);
    return data.map(s => ({
      name: s.namn,
      description: s.beskrivning
    }));
  },

  /**
   * Get land cover classification
   * Endpoint: GET /omrade/{areaId}/{status}/nmdklasser
   */
  async getAreaLandCover(areaId: string, status: string = "Gällande"): Promise<LandCover[]> {
    const encodedStatus = encodeURIComponent(status);
    const data = await client.request<NvvNmdKlass[]>(`/omrade/${areaId}/${encodedStatus}/nmdklasser`);
    return data.map(n => ({
      name: n.namn,
      code: n.kod,
      area_ha: n.areaHa
    }));
  },

  /**
   * Get environmental goals
   * Endpoint: GET /omrade/{areaId}/{status}/miljomal
   */
  async getAreaEnvironmentalGoals(areaId: string, status: string = "Gällande"): Promise<EnvironmentalGoal[]> {
    const encodedStatus = encodeURIComponent(status);
    const data = await client.request<NvvMiljomal[]>(`/omrade/${areaId}/${encodedStatus}/miljomal`);
    return data.map(m => ({
      name: m.namn
    }));
  },

  /**
   * Get regulation zones
   * Endpoint: GET /omrade/{areaId}/{status}/foreskriftsomraden
   */
  async getAreaRegulations(areaId: string, status: string = "Gällande"): Promise<Regulation[]> {
    const encodedStatus = encodeURIComponent(status);
    const data = await client.request<NvvForeskriftsomrade[]>(
      `/omrade/${areaId}/${encodedStatus}/foreskriftsomraden`
    );
    return data.map(f => ({
      type: f.foreskriftstyp,
      subtype: f.foreskriftssubtyp,
      area_ha: f.areaHa
    }));
  },

  /**
   * Get bounding box for multiple areas
   * Endpoint: GET /omrade/extentAsWkt
   */
  async getAreasExtent(areaIds: string[]): Promise<string> {
    return client.request<string>("/omrade/extentAsWkt", {
      params: { id: areaIds.join(",") }
    });
  }
};
