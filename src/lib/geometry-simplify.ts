/**
 * WKT geometry simplification using Douglas-Peucker algorithm
 *
 * Reduces coordinate count by 90-96% while preserving shape.
 * Large nature reserves can have 3,000-6,000+ coordinates — this
 * brings them down to ~100-400 points, saving ~20-40K LLM tokens.
 */

const DEFAULT_TOLERANCE = 0.001; // ~100m at Swedish latitudes

/**
 * Simplify a WKT geometry string (POLYGON or MULTIPOLYGON)
 *
 * Finds innermost parenthesized coordinate groups, simplifies each ring
 * independently via Douglas-Peucker, and reconstructs the WKT string.
 *
 * Rings that would shrink below 4 points (minimum valid polygon) are
 * kept unsimplified.
 */
export function simplifyWkt(wkt: string, tolerance: number = DEFAULT_TOLERANCE): string {
  // Match innermost parenthesized groups containing coordinate data
  // These are the actual coordinate rings — outer parens are structural
  return wkt.replace(/\(([^()]+)\)/g, (_match, coordString: string) => {
    const coords = parseCoordRing(coordString);
    if (coords.length < 4) return `(${coordString})`;

    const simplified = simplifyPath(coords, tolerance);

    // Valid polygon ring needs minimum 4 points (3 unique + closing)
    if (simplified.length < 4) return `(${coordString})`;

    // Ensure ring is closed (first == last)
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      simplified.push([...first] as [number, number]);
    }

    return `(${simplified.map(([x, y]) => `${x} ${y}`).join(', ')})`;
  });
}

/**
 * Parse a WKT coordinate ring string into [x, y] pairs
 * Input: "18.123 59.456, 18.789 59.012, ..."
 */
function parseCoordRing(coordString: string): [number, number][] {
  return coordString
    .split(',')
    .map((pair) => {
      const parts = pair.trim().split(/\s+/);
      if (parts.length < 2) return null;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (isNaN(x) || isNaN(y)) return null;
      return [x, y] as [number, number];
    })
    .filter((c): c is [number, number] => c !== null);
}

/**
 * Douglas-Peucker line simplification algorithm
 *
 * Ported from mcp-trafikverket geometry-utils.ts
 */
function simplifyPath(coords: [number, number][], tolerance: number): [number, number][] {
  if (coords.length <= 2) return coords;

  let maxDist = 0;
  let maxIndex = 0;
  const first = coords[0];
  const last = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const dist = perpendicularDistance(coords[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(coords.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(coords.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const lineLengthSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;

  if (lineLengthSq === 0) {
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }

  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(lineLengthSq);

  return numerator / denominator;
}
