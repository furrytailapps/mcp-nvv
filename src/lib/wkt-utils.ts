/**
 * WKT utilities for geometry processing and coordinate conversion
 *
 * Includes:
 * - Client-side bounding box calculation (workaround for NVV API bug)
 * - WKT coordinate conversion from SWEREF99TM to WGS84
 *
 * WORKAROUND: The NVV API's /omrade/extentAsWkt endpoint fails with Oracle
 * error ORA-28579 when called with multiple area IDs.
 *
 * TODO: Remove workaround when NVV fixes their API bug. Test by calling:
 *   curl "https://geodata.naturvardsverket.se/naturvardsregistret/rest/v3/omrade/extentAsWkt?id=2000019,2000140"
 * If it returns valid WKT (starting with "POLYGON") instead of Oracle error, the bug is fixed.
 */

import { sweref99ToWgs84 } from './coordinates';

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// WORKAROUND: Client-side bbox extraction (NVV extentAsWkt endpoint fails with Oracle errors)
export function extractBoundingBoxFromWkt(wkt: string): BoundingBox {
  // Match all coordinate pairs: "number number"
  const coordPattern = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let matchCount = 0;

  let match: RegExpExecArray | null;
  while ((match = coordPattern.exec(wkt)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    matchCount++;
  }

  if (matchCount === 0) {
    throw new Error('No coordinates found in WKT string');
  }

  return { minX, maxX, minY, maxY };
}

// WORKAROUND: Combine multiple bounding boxes into one
export function combineBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    throw new Error('Cannot combine empty array of bounding boxes');
  }

  return boxes.reduce((combined, box) => ({
    minX: Math.min(combined.minX, box.minX),
    maxX: Math.max(combined.maxX, box.maxX),
    minY: Math.min(combined.minY, box.minY),
    maxY: Math.max(combined.maxY, box.maxY),
  }));
}

// WORKAROUND: Convert bbox to WKT POLYGON matching NVV API output format
export function boundingBoxToWkt(box: BoundingBox): string {
  const { minX, maxX, minY, maxY } = box;
  return `POLYGON (( ${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`;
}

export function convertWktToWgs84(wkt: string): string {
  const coordPattern = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g;

  return wkt.replace(coordPattern, (_match, xStr: string, yStr: string) => {
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    const wgs84 = sweref99ToWgs84({ x, y });
    // WKT uses "x y" = "longitude latitude" for WGS84; 6 decimals ~ 11cm precision
    return `${wgs84.longitude.toFixed(6)} ${wgs84.latitude.toFixed(6)}`;
  });
}
