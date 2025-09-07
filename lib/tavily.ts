export type TavilySearchOptions = {
  searchDepth?: "basic" | "advanced";
  maxResults?: number; // 1-20
  includeAnswer?: boolean;
  includeImages?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
};

export type TavilyResult = {
  title: string;
  url: string;
  content?: string;
  score?: number;
};

export type TavilySearchResponse = {
  query: string;
  results: TavilyResult[];
  answer?: string;
};

export async function tavilySearch(
  query: string,
  opts: TavilySearchOptions = {},
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing TAVILY_API_KEY. Please set it in your environment variables.",
    );
  }

  const body: Record<string, any> = {
    api_key: apiKey,
    query,
    search_depth: opts.searchDepth ?? "basic",
    max_results: Math.max(1, Math.min(20, opts.maxResults ?? 5)),
    include_answer: opts.includeAnswer ?? true,
    include_images: opts.includeImages ?? false,
  };
  if (opts.includeDomains?.length) body.include_domains = opts.includeDomains;
  if (opts.excludeDomains?.length) body.exclude_domains = opts.excludeDomains;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error: ${res.status} ${text}`);
  }
  const json = await res.json();

  // Normalize minimal shape used by our pipeline
  const results: TavilyResult[] = (json.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    content: r.content ?? r.snippet ?? undefined,
    score: r.score ?? undefined,
  }));

  return {
    query,
    results,
    answer: json.answer,
  };
}
