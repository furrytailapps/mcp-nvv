import { createHttpClient } from '@/lib/http-client';
import { runWithConcurrency, NVV_API_CONCURRENCY } from '@/lib/concurrency';
import { extractBoundingBoxFromWkt, combineBoundingBoxes, boundingBoxToWkt, convertWktToWgs84 } from '@/lib/wkt-utils';
import {
  type N2000RawArea,
  type N2000RawSpecies,
  type N2000RawHabitat,
  type N2000RawNmdKlass,
  type N2000RawDocument,
  type N2000Area,
  type N2000Species,
  type N2000Habitat,
  type N2000LandCover,
  type N2000Document,
} from '@/types/n2000-api';

const N2000_API_BASE = 'https://geodata.naturvardsverket.se/n2000/rest/v3';

const client = createHttpClient({
  baseUrl: N2000_API_BASE,
  timeout: 30000,
});

function transformArea(area: N2000RawArea): N2000Area {
  return {
    kod: area.kod,
    name: area.namn,
    area_type: area.omradestypkod,
    county: area.lan,
    municipalities: area.kommun,
    area_ha: area.areaHa,
    land_area_ha: area.landareaHa,
    water_area_ha: area.vattenareaHa,
    forest_area_ha: area.skogAreaHa,
    decision_date: area.beslutsdatum,
    quality: area.kvalitet,
    character: area.karaktar,
  };
}

function transformSpecies(species: N2000RawSpecies): N2000Species {
  return {
    name: species.namn,
    group: species.grupp,
  };
}

function transformHabitat(habitat: N2000RawHabitat): N2000Habitat {
  return {
    code: habitat.kod,
    name: habitat.namn,
    area_ha: habitat.areaHa,
  };
}

function transformLandCover(nmd: N2000RawNmdKlass): N2000LandCover {
  return {
    code: nmd.kod,
    name: nmd.namn,
    area_ha: nmd.areaHa,
  };
}

function transformDocument(doc: N2000RawDocument): N2000Document {
  return {
    id: doc.id,
    name: doc.namn,
    file_type: doc.filtyp,
    mime_type: doc.mimetyp,
    file_url: doc.fileUrl,
  };
}

export const n2000Client = {
  async listAreas(params: {
    kommun?: string;
    lan?: string;
    namn?: string;
    artnamn?: string;
    naturtypkod?: string;
    limit?: number;
  }): Promise<N2000Area[]> {
    const areas = await client.request<N2000RawArea[]>('/omrade/nolinks', {
      params: {
        kommun: params.kommun,
        lan: params.lan,
        namn: params.namn,
        artnamn: params.artnamn,
        naturtypkod: params.naturtypkod,
        limit: params.limit ?? 100,
      },
    });
    return areas.map(transformArea);
  },

  async getArea(kod: string): Promise<N2000Area> {
    const area = await client.request<N2000RawArea>(`/omrade/${encodeURIComponent(kod)}`);
    return transformArea(area);
  },

  async getAreaSpecies(kod: string): Promise<N2000Species[]> {
    const species = await client.request<N2000RawSpecies[]>(`/omrade/${encodeURIComponent(kod)}/arter`);
    return species.map(transformSpecies);
  },

  async getAreaHabitats(kod: string): Promise<N2000Habitat[]> {
    const habitats = await client.request<N2000RawHabitat[]>(`/omrade/${encodeURIComponent(kod)}/naturtyper`);
    return habitats.map(transformHabitat);
  },

  async getAreaLandCover(kod: string): Promise<N2000LandCover[]> {
    const nmd = await client.request<N2000RawNmdKlass[]>(`/omrade/${encodeURIComponent(kod)}/nmdklasser`);
    return nmd.map(transformLandCover);
  },

  async getAreaWkt(kod: string): Promise<string> {
    const wkt = await client.request<string>(`/omrade/${encodeURIComponent(kod)}/wkt`);
    return convertWktToWgs84(wkt);
  },

  async getAreaDocuments(kod: string): Promise<N2000Document[]> {
    const docs = await client.request<N2000RawDocument[]>(`/omrade/${encodeURIComponent(kod)}/dokument`);
    return docs.map(transformDocument);
  },

  async getAllSpecies(): Promise<N2000Species[]> {
    const species = await client.request<N2000RawSpecies[]>('/arter');
    return species.map(transformSpecies);
  },

  async getSpeciesByGroup(group: string): Promise<N2000Species[]> {
    const species = await client.request<N2000RawSpecies[]>(`/arter/${encodeURIComponent(group)}`);
    return species.map(transformSpecies);
  },

  async getAllHabitats(): Promise<N2000Habitat[]> {
    const habitats = await client.request<N2000RawHabitat[]>('/naturtyper');
    return habitats.map(transformHabitat);
  },

  async getAreaTypes(): Promise<string[]> {
    return client.request<string[]>('/omrade/omradestyper');
  },

  async getAreasExtent(kods: string[]): Promise<string> {
    try {
      const result = await client.request<string>('/omrade/extentAsWkt', {
        params: { kod: kods.join(',') },
      });

      if (result.startsWith('POLYGON')) {
        return convertWktToWgs84(result);
      }

      throw new Error('Invalid WKT response');
    } catch {
      return this.computeExtentClientSide(kods);
    }
  },

  async computeExtentClientSide(kods: string[]): Promise<string> {
    const wktResults = await runWithConcurrency(
      kods.map((kod) => () => this.getAreaWkt(kod)),
      NVV_API_CONCURRENCY,
    );

    const boundingBoxes = wktResults.map(extractBoundingBoxFromWkt);
    const combinedBox = combineBoundingBoxes(boundingBoxes);
    return boundingBoxToWkt(combinedBox);
  },
};
