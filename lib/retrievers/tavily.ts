import { RetrieverFn, RetrieverResponse } from "./types";
import { tavilySearch } from "@/lib/tavily";

export const tavilyRetriever: RetrieverFn = async (query, opts = {}) => {
  const res = await tavilySearch(query, {
    maxResults: opts.maxResults ?? 5,
    searchDepth: "advanced",
    includeAnswer: true,
  });
  return {
    provider: "tavily",
    query,
    results: (res.results || []).slice(0, opts.maxResults ?? 5).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
  } satisfies RetrieverResponse;
};
