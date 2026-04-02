import proj4 from 'proj4';
import { ValidationError } from './errors';

export const CRS_SWEREF99TM = 'EPSG:3006';
export const CRS_WGS84 = 'EPSG:4326';

// Official SWEREF99 TM projection definition from Lantmäteriet
proj4.defs('EPSG:3006', '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

export interface Sweref99Point {
  x: number; // Easting
  y: number; // Northing
}

export interface Wgs84Point {
  latitude: number;
  longitude: number;
}

export interface Sweref99Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Wgs84Bbox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

const WGS84_BOUNDS = {
  minLat: 55.0,
  maxLat: 69.0,
  minLon: 11.0,
  maxLon: 24.0,
};

export function isValidWgs84Coordinate(latitude: number, longitude: number): boolean {
  return (
    latitude >= WGS84_BOUNDS.minLat &&
    latitude <= WGS84_BOUNDS.maxLat &&
    longitude >= WGS84_BOUNDS.minLon &&
    longitude <= WGS84_BOUNDS.maxLon
  );
}

export function sweref99ToWgs84(point: Sweref99Point): Wgs84Point {
  // proj4 uses [x, y] = [easting, northing] order for projected CRS
  const result = proj4('EPSG:3006', 'EPSG:4326', [point.x, point.y]);

  return {
    longitude: result[0],
    latitude: result[1],
  };
}

export function wgs84ToSweref99(point: Wgs84Point): Sweref99Point {
  if (!isValidWgs84Coordinate(point.latitude, point.longitude)) {
    throw new ValidationError(
      `WGS84 coordinates (${point.latitude}, ${point.longitude}) are outside valid range for Sweden (55-69°N, 11-24°E)`,
      'coordinates',
    );
  }

  const result = proj4('EPSG:4326', 'EPSG:3006', [point.longitude, point.latitude]);

  return {
    x: result[0],
    y: result[1],
  };
}

// Minimum buffer in meters (SWEREF99TM) added to all bbox queries.
// Ensures point queries (equal min/max) produce a searchable area,
// and normal bbox queries capture features near boundaries.
const BBOX_BUFFER_M = 200;

export function wgs84BboxToSweref99(bbox: Wgs84Bbox, bufferM: number = BBOX_BUFFER_M): Sweref99Bbox {
  if (!isValidWgs84Coordinate(bbox.minLat, bbox.minLon)) {
    throw new ValidationError(
      `WGS84 coordinates (${bbox.minLat}, ${bbox.minLon}) are outside valid range for Sweden (55-69°N, 11-24°E)`,
      'bbox',
    );
  }
  if (!isValidWgs84Coordinate(bbox.maxLat, bbox.maxLon)) {
    throw new ValidationError(
      `WGS84 coordinates (${bbox.maxLat}, ${bbox.maxLon}) are outside valid range for Sweden (55-69°N, 11-24°E)`,
      'bbox',
    );
  }
  if (bbox.minLat > bbox.maxLat) {
    throw new ValidationError('minLat must be less than or equal to maxLat', 'bbox');
  }
  if (bbox.minLon > bbox.maxLon) {
    throw new ValidationError('minLon must be less than or equal to maxLon', 'bbox');
  }

  const minCorner = wgs84ToSweref99({ latitude: bbox.minLat, longitude: bbox.minLon });
  const maxCorner = wgs84ToSweref99({ latitude: bbox.maxLat, longitude: bbox.maxLon });

  return {
    minX: minCorner.x - bufferM,
    minY: minCorner.y - bufferM,
    maxX: maxCorner.x + bufferM,
    maxY: maxCorner.y + bufferM,
  };
}
