/**
 * Types for Naturvardsverket API responses
 */

export interface NvvArea {
  id: string;
  namn: string;
  skyddstyp: string;
  beslutsstatus: string;
  areaHa: number;
  landareaHa: number;
  vattenareaHa: number;
  skogAreaHa: number;
  beslutsdatum: string;
  gallandedatum: string;
  ursprBeslutsdatum: string;
  ikrafttradandedatumForeskrifter: string;
  lanAsText: string;
  kommunerAsText: string;
  forvaltare: string;
  beslutsmyndighet: string;
  tillsynsmyndighet: string;
  provningsmyndighetTillstand: string;
  provningsmyndighetDispens: string;
  iucnKategori: string;
  beslutstyp: string;
  beskrivning: string;
}

export interface NvvSyfte {
  namn: string;
  beskrivning: string;
}

export interface NvvNmdKlass {
  namn: string;
  kod: string;
  areaHa: number;
}

export interface NvvMiljomal {
  namn: string;
}

export interface NvvForeskriftsomrade {
  foreskriftstyp: string;
  foreskriftssubtyp: string;
  areaHa: number;
}

/**
 * Transformed types for tool responses
 */

export interface ProtectedArea {
  id: string;
  name: string;
  type: string;
  decision_status: string;
  area_ha: number;
  land_area_ha: number;
  water_area_ha: number;
  forest_area_ha: number;
  decision_date: string;
  valid_date: string;
  original_decision_date: string;
  regulation_effective_date: string;
  county: string;
  municipalities: string;
  manager: string;
  decision_authority: string;
  supervisory_authority: string;
  permit_authority: string;
  exemption_authority: string;
  iucn_category: string;
  decision_type: string;
  description: string;
}

export interface Purpose {
  name: string;
  description: string;
}

export interface LandCover {
  name: string;
  code: string;
  area_ha: number;
}

export interface EnvironmentalGoal {
  name: string;
}

export interface Regulation {
  type: string;
  subtype: string;
  area_ha: number;
}

export interface Municipality {
  code: string;
  name: string;
}

export interface County {
  code: string;
  name: string;
}
