import { createHttpClient } from '@/lib/http-client';
import { UpstreamApiError } from '@/lib/errors';
import type { Sweref99Bbox } from '@/lib/coordinates';
import type { WfsFeatureCollection, WfsNationalProperties, WfsN2000Properties } from '@/types/nvv-api';

const nationalWfs = createHttpClient({
  baseUrl: 'https://geodata.naturvardsverket.se/naturvardsregistret/wfs',
  timeout: 30000,
});

const n2000Wfs = createHttpClient({
  baseUrl: 'https://geodata.naturvardsverket.se/n2000/wfs',
  timeout: 30000,
});

// WFS 2.0 EPSG:3006 axis order: northing,easting (Y,X then Y,X)
function buildBboxString(bbox: Sweref99Bbox): string {
  return `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX},EPSG:3006`;
}

export interface WfsBboxArea {
  id: string;
  name: string;
  type: string;
  area_ha: number;
  municipalities: string;
  county: string;
}

// GEOJSON is a GeoServer-specific alias; application/json is not supported by NVV's GeoServer.
// propertyName would exclude geometry but causes malformed JSON output — GeoServer bug.

export const wfsClient = {
  async searchNational(bbox: Sweref99Bbox, limit: number): Promise<WfsBboxArea[]> {
    const bboxStr = buildBboxString(bbox);

    let data: WfsFeatureCollection<WfsNationalProperties>;
    try {
      data = await nationalWfs.request<WfsFeatureCollection<WfsNationalProperties>>('', {
        params: {
          service: 'WFS',
          version: '2.0.0',
          request: 'GetFeature',
          typeNames: 'SkyddadeOmraden',
          bbox: bboxStr,
          count: limit,
          outputFormat: 'GEOJSON',
        },
      });
    } catch (error) {
      if (error instanceof UpstreamApiError) throw error;
      throw new UpstreamApiError(
        'Failed to search national protected areas by location. The data service may be temporarily unavailable — try again or use kommun/lan codes instead.',
        0,
        'naturvardsregistret/wfs',
      );
    }

    if (!data.features || !Array.isArray(data.features)) {
      throw new UpstreamApiError(
        'National protected areas search returned an unexpected response. Try again or use kommun/lan codes instead.',
        0,
        'naturvardsregistret/wfs',
      );
    }

    return data.features.map((f) => ({
      id: f.properties.NVRID,
      name: f.properties.NAMN,
      type: f.properties.SKYDDSTYP,
      area_ha: f.properties.AREA_HA,
      municipalities: f.properties.KOMMUN,
      county: f.properties.LAN,
    }));
  },

  async searchN2000(bbox: Sweref99Bbox, limit: number): Promise<WfsBboxArea[]> {
    const bboxStr = buildBboxString(bbox);

    let data: WfsFeatureCollection<WfsN2000Properties>;
    try {
      data = await n2000Wfs.request<WfsFeatureCollection<WfsN2000Properties>>('', {
        params: {
          service: 'WFS',
          version: '2.0.0',
          request: 'GetFeature',
          typeNames: 'N2000_WFS:N2000',
          bbox: bboxStr,
          count: limit,
          outputFormat: 'GEOJSON',
        },
      });
    } catch (error) {
      if (error instanceof UpstreamApiError) throw error;
      throw new UpstreamApiError(
        'Failed to search Natura 2000 areas by location. The data service may be temporarily unavailable — try again or use kommun/lan codes instead.',
        0,
        'n2000/wfs',
      );
    }

    if (!data.features || !Array.isArray(data.features)) {
      throw new UpstreamApiError(
        'Natura 2000 search returned an unexpected response. Try again or use kommun/lan codes instead.',
        0,
        'n2000/wfs',
      );
    }

    return data.features.map((f) => ({
      id: f.properties.OMRADESKOD,
      name: f.properties.OMRADESNAMN,
      type: f.properties.OMRADESTYP,
      area_ha: f.properties.AREA_HA,
      municipalities: f.properties.KOMMUN,
      county: f.properties.LAN,
    }));
  },
};
