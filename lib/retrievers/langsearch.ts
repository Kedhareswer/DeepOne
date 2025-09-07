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
    const json: { webPages?: { value?: unknown[] } } = await res.json();
    const values: unknown[] = json?.webPages?.value || [];
    const results = values.map((v) => {
      type LangWebPage = { name?: string; title?: string; displayUrl?: string; url?: string; webSearchUrl?: string; summary?: string; snippet?: string };
      const item = v as LangWebPage;
      return {
        title: String(item.name || item.title || item.displayUrl || "Untitled"),
        url: String(item.url || item.webSearchUrl || ""),
        content: String(item.summary || item.snippet || ""),
        score: undefined,
      };
    }).filter((r) => r.url);

    return { provider: "langsearch", query, results };
  } finally {
    clearTimeout(timeout);
  }
};
