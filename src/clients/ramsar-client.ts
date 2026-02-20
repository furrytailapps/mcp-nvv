import { createHttpClient } from '@/lib/http-client';
import { runWithConcurrency, NVV_API_CONCURRENCY } from '@/lib/concurrency';
import { extractBoundingBoxFromWkt, combineBoundingBoxes, boundingBoxToWkt, convertWktToWgs84 } from '@/lib/wkt-utils';
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

function transformLandCover(nmd: RamsarRawNmdKlass): RamsarLandCover {
  return {
    ramsar_id: nmd.ramsarId,
    code: nmd.kod,
    name: nmd.namn,
    area_ha: nmd.areaHa,
  };
}

function transformProtectionType(type: RamsarRawProtectionType): RamsarProtectionType {
  return {
    key: type.key,
    value: type.value,
  };
}

export const ramsarClient = {
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

  async getArea(id: string): Promise<RamsarArea> {
    const area = await client.request<RamsarRawArea>(`/ramsar/${encodeURIComponent(id)}`);
    return transformArea(area);
  },

  async getAreaWkt(id: string): Promise<string> {
    const wkt = await client.request<string>(`/ramsar/${encodeURIComponent(id)}/wkt`);
    return convertWktToWgs84(wkt);
  },

  async getAreaLandCover(id: string): Promise<RamsarLandCover[]> {
    const nmd = await client.request<RamsarRawNmdKlass[]>(`/ramsar/${encodeURIComponent(id)}/nmdklasser`);
    return nmd.map(transformLandCover);
  },

  async getProtectionTypes(): Promise<RamsarProtectionType[]> {
    const types = await client.request<RamsarRawProtectionType[]>('/ramsar/skyddstyper/list');
    return types.map(transformProtectionType);
  },

  async getAreasExtent(ids: string[]): Promise<string> {
    try {
      const result = await client.request<string>('/ramsar/extentAsWkt', {
        params: { id: ids.join(',') },
      });

      if (result.startsWith('POLYGON')) {
        return convertWktToWgs84(result);
      }

      throw new Error('Invalid WKT response');
    } catch {
      return this.computeExtentClientSide(ids);
    }
  },

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
