export type RetrieverResult = {
  title: string;
  url: string;
  content?: string;
  score?: number;
};

export type RetrieverResponse = {
  provider: string;
  query: string;
  results: RetrieverResult[];
};

export type RetrieverOptions = {
  maxResults?: number; // 1-20
  timeoutMs?: number; // per-request timeout
};

export type RetrieverFn = (
  query: string,
  opts?: RetrieverOptions,
) => Promise<RetrieverResponse>;
