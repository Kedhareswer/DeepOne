import { RetrieverFn, RetrieverResponse } from "./types";

// Bing Web Search API v7
// Docs: https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/endpoints
export const bingRetriever: RetrieverFn = async (query, opts = {}) => {
  const apiKey = process.env.BING_API_KEY;
  if (!apiKey) throw new Error("Missing BING_API_KEY");

  const max = Math.max(1, Math.min(10, opts.maxResults ?? 5));
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(max));
  url.searchParams.set("textDecorations", "false");
  url.searchParams.set("safeSearch", "Moderate");

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`bing http ${res.status}`);
    const json = await res.json();

    type BingWebPage = { name: string; url: string; snippet?: string };
    const items: BingWebPage[] = (json.webPages?.value || []) as BingWebPage[];
    return {
      provider: "bing",
      query,
      results: items.slice(0, max).map((item) => {
        return {
          title: item.name,
          url: item.url,
          content: item.snippet,
        };
      }),
    } satisfies RetrieverResponse;
  } finally {
    clearTimeout(to);
  }
};
