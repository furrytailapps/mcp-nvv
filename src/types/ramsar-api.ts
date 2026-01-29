/**
 * Types for International Conventions (Ramsar) API responses
 * API: https://geodata.naturvardsverket.se/internationellakonventioner/rest/v3
 */

// ============================================
// Raw API Response Types
// ============================================

export interface RamsarRawArea {
  id: string;
  objectId: number;
  skyddstyp: string;
  nation: string;
  namn: string;
  lanAsText: string;
  kommunerAsText: string;
  totalArealHA: number;
  shapeAreaHA: number;
  landHA: number;
  length: number;
  skogHA: number;
  vattenHA: number;
  ursprungligtBeslut: string;
  senastBeslut: string;
  legalAct: string;
}

export interface RamsarRawNmdKlass {
  ramsarId: string;
  kod: string;
  namn: string;
  areaHa: number;
}

export interface RamsarRawProtectionType {
  key: string;
  value: string;
}

// ============================================
// Transformed Types for Tool Responses
// ============================================

export interface RamsarArea {
  id: string;
  name: string;
  protection_type: string;
  nation: string;
  county: string;
  municipalities: string;
  total_area_ha: number;
  shape_area_ha: number;
  land_area_ha: number;
  forest_area_ha: number;
  water_area_ha: number;
  original_decision: string;
  latest_decision: string;
  legal_act: string;
}

export interface RamsarLandCover {
  ramsar_id: string;
  code: string;
  name: string;
  area_ha: number;
}

export interface RamsarProtectionType {
  key: string;
  value: string;
}
