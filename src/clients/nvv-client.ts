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
  async getArea(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<ProtectedArea> {
    const area = await client.request<NvvArea>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}`);
    return transformArea(area);
  },

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

  async getAreaWkt(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<string> {
    const wkt = await client.request<string>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/wkt`);
    return convertWktToWgs84(wkt);
  },

  async getAreaPurposes(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<Purpose[]> {
    const data = await client.request<NvvSyfte[]>(`/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/syften`);
    return data.map((s) => ({
      name: s.namn,
      description: s.beskrivning,
    }));
  },

  async getAreaLandCover(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<LandCover[]> {
    const data = await client.request<NvvNmdKlass[]>(
      `/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/nmdklasser`,
    );
    return data.map((n) => ({
      name: n.namn,
      code: n.kod,
      area_ha: n.areaHa,
    }));
  },

  async getAreaEnvironmentalGoals(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<EnvironmentalGoal[]> {
    const data = await client.request<NvvMiljomal[]>(
      `/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/miljomal`,
    );
    return data.map((m) => ({ name: m.namn }));
  },

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

  async getAreaDocuments(areaId: string, status = DEFAULT_DECISION_STATUS): Promise<Document[]> {
    const data = await client.request<NvvDocument[]>(
      `/omrade/${encodeURIComponent(areaId)}/${encodeURIComponent(status)}/beslutsdokument`,
    );
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

  // WORKAROUND: NVV extentAsWkt endpoint fails with Oracle error ORA-28579 for multiple IDs.
  // Try original API first (auto-heals when NVV fixes their bug), fall back to client-side.
  async getAreasExtent(areaIds: string[]): Promise<string> {
    try {
      const result = await client.request<string>('/omrade/extentAsWkt', {
        params: { id: areaIds.join(',') },
      });

      if (result.startsWith('POLYGON')) {
        return convertWktToWgs84(result);
      }

      throw new Error('Invalid WKT response');
    } catch {
      return this.computeExtentClientSide(areaIds);
    }
  },

  // WORKAROUND: Client-side extent calculation because NVV extentAsWkt fails with ORA-28579.
  // TODO: Remove when NVV fixes their API. Test:
  //   curl "https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3/omrade/extentAsWkt?id=2000019,2000140"
  // If it returns valid WKT instead of Oracle error, the bug is fixed.
  async computeExtentClientSide(areaIds: string[]): Promise<string> {
    const wktResults = await runWithConcurrency(
      areaIds.map((id) => () => this.getAreaWkt(id)),
      NVV_API_CONCURRENCY,
    );

    const boundingBoxes = wktResults.map(extractBoundingBoxFromWkt);
    const combinedBox = combineBoundingBoxes(boundingBoxes);
    return boundingBoxToWkt(combinedBox);
  },
};
