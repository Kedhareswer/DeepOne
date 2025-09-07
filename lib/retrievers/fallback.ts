import { RetrieverFn, RetrieverOptions, RetrieverResponse } from "./types";

// Simple token bucket per retriever name (in-memory)
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

function allow(name: string, rps = 2, burst = 5) {
  const now = Date.now();
  const bucket = buckets.get(name) ?? { tokens: burst, lastRefill: now };
  const delta = (now - bucket.lastRefill) / 1000;
  const newTokens = Math.min(burst, bucket.tokens + delta * rps);
  const allowed = newTokens >= 1;
  buckets.set(name, { tokens: allowed ? newTokens - 1 : newTokens, lastRefill: now });
  return allowed;
}

export async function retrieveWithFallback(
  query: string,
  retrievers: { name: string; fn: RetrieverFn; rps?: number; burst?: number }[],
  opts: RetrieverOptions = {},
): Promise<RetrieverResponse & { from: string } | null> {
  const errors: any[] = [];
  for (const r of retrievers) {
    try {
      if (!allow(r.name, r.rps ?? 2, r.burst ?? 5)) {
        // soft skip: try next retriever
        continue;
      }
      const res = await r.fn(query, opts);
      if (res.results?.length) {
        return Object.assign({ from: r.name }, res);
      }
    } catch (e) {
      errors.push({ name: r.name, error: String(e) });
      // try next
    }
  }
  return null;
}
