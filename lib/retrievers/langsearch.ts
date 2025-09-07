import { RetrieverFn, RetrieverOptions, RetrieverResponse } from "./types";

// LangSearch Web Search API: https://docs.langsearch.com/api/web-search-api
// POST https://api.langsearch.com/v1/web-search
// Authorization: Bearer <LANGSEARCH_API_KEY>
// Body: { query: string, freshness?: 'oneDay'|'oneWeek'|'oneMonth'|'oneYear'|'noLimit', summary?: boolean, count?: 1..10 }

export const langSearchRetriever: RetrieverFn = async (
  query: string,
  opts: RetrieverOptions = {},
): Promise<RetrieverResponse> => {
  const key = process.env.LANGSEARCH_API_KEY;
  if (!key) {
    // No key present -> return empty set so fallback can try others
    return { provider: "langsearch", query, results: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3000, opts.timeoutMs ?? 10000));
  try {
    const count = Math.max(1, Math.min(10, opts.maxResults ?? 10));
    const res = await fetch("https://api.langsearch.com/v1/web-search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, freshness: "noLimit", summary: true, count }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LangSearch error ${res.status}: ${text}`);
    }
    const json: any = await res.json();
    const values: any[] = json?.webPages?.value || [];
    const results = values.map((v) => ({
      title: String(v.name || v.title || v.displayUrl || "Untitled"),
      url: String(v.url || v.webSearchUrl || ""),
      content: String(v.summary || v.snippet || ""),
      score: undefined,
    })).filter((r) => r.url);

    return { provider: "langsearch", query, results };
  } finally {
    clearTimeout(timeout);
  }
};
