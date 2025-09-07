import { RetrieverFn, RetrieverResponse } from "./types";

// DuckDuckGo Instant Answer API (limited; returns related topics)
// Docs: https://api.duckduckgo.com/?q=QUERY&format=json&no_redirect=1&no_html=1
export const ddgRetriever: RetrieverFn = async (query, opts = {}) => {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("no_html", "1");

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`ddg http ${res.status}`);
    const json = await res.json();

    const results: { title: string; url: string; content?: string }[] = [];

    if (Array.isArray(json.RelatedTopics)) {
      for (const t of json.RelatedTopics) {
        if (t && t.FirstURL && t.Text) {
          results.push({ title: t.Text, url: t.FirstURL });
        } else if (t && Array.isArray(t.Topics)) {
          for (const tt of t.Topics) {
            if (tt && tt.FirstURL && tt.Text) {
              results.push({ title: tt.Text, url: tt.FirstURL });
            }
          }
        }
      }
    }

    const max = opts.maxResults ?? 5;
    return {
      provider: "duckduckgo",
      query,
      results: results.slice(0, max),
    } satisfies RetrieverResponse;
  } finally {
    clearTimeout(to);
  }
};
