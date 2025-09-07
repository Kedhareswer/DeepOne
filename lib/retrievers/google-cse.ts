import { RetrieverFn, RetrieverResponse } from "./types";

export const googleCSERetriever: RetrieverFn = async (query, opts = {}) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX_KEY;
  if (!apiKey || !cx) {
    throw new Error("Missing GOOGLE_API_KEY or GOOGLE_CX_KEY");
  }
  const max = Math.max(1, Math.min(10, opts.maxResults ?? 5));
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(max));

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`google cse http ${res.status}`);
    const json = await res.json();

    const items: any[] = json.items || [];
    return {
      provider: "google_cse",
      query,
      results: items.slice(0, max).map((it) => ({
        title: it.title,
        url: it.link,
        content: it.snippet,
      })),
    } satisfies RetrieverResponse;
  } finally {
    clearTimeout(to);
  }
};
