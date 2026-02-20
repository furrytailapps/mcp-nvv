export async function runWithConcurrency<T>(fns: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < fns.length; i += concurrency) {
    const batch = fns.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

// Max concurrent requests — prevents NVV rate limiting / 503 errors
export const NVV_API_CONCURRENCY = 2;
