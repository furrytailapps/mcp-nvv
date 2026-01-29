/**
 * Types for Natura 2000 API responses
 * API: https://geodata.naturvardsverket.se/n2000/rest/v3
 */

// ============================================
// Raw API Response Types
// ============================================

export interface N2000RawArea {
  kod: string;
  namn: string;
  omradestypkod: string;
  lan: string;
  kommun: string;
  areaHa: number;
  landareaHa: number;
  vattenareaHa: number;
  skogAreaHa: number;
  beslutsdatum: string;
  kvalitet: string;
  karaktar: string;
}

export interface N2000RawSpecies {
  namn: string;
  grupp: string;
}

export interface N2000RawHabitat {
  kod: string;
  namn: string;
  areaHa: number;
}

export interface N2000RawNmdKlass {
  kod: string;
  namn: string;
  areaHa: number;
}

export interface N2000RawDocument {
  id: string;
  namn: string;
  filtyp: string;
  mimetyp: string;
  fileUrl: string;
}

// ============================================
// Transformed Types for Tool Responses
// ============================================

export interface N2000Area {
  kod: string;
  name: string;
  area_type: string; // SPA, SCI, or SPA/SCI
  county: string;
  municipalities: string;
  area_ha: number;
  land_area_ha: number;
  water_area_ha: number;
  forest_area_ha: number;
  decision_date: string;
  quality: string;
  character: string;
}

export interface N2000Species {
  name: string;
  group: string; // e.g., "B - Fåglar" (Birds), "M - Däggdjur" (Mammals)
}

export interface N2000Habitat {
  code: string; // EU habitat code (e.g., "9010")
  name: string;
  area_ha: number;
}

export interface N2000LandCover {
  code: string;
  name: string;
  area_ha: number;
}

export interface N2000Document {
  id: string;
  name: string;
  file_type: string;
  mime_type: string;
  file_url: string;
}

// ============================================
// Area Type Constants
// ============================================

// Natura 2000 area types
export const N2000_AREA_TYPES = {
  SPA: 'SPA', // Special Protection Area (Birds Directive)
  SCI: 'SCI', // Site of Community Importance (Habitats Directive)
  SPA_SCI: 'SPA/SCI', // Both designations
} as const;

// Species group codes and names
export const N2000_SPECIES_GROUPS = {
  B: 'Fåglar', // Birds
  M: 'Däggdjur', // Mammals
  R: 'Reptiler', // Reptiles
  A: 'Amfibier', // Amphibians
  F: 'Fiskar', // Fish
  I: 'Evertebrater', // Invertebrates
  P: 'Växter', // Plants
} as const;
