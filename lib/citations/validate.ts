import { SourceItem } from "./format";

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.toString();
  } catch {
    return url;
  }
}

export function hostFromUrl(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

export function dedupeAndEnrich(sources: { title: string; url: string; author?: string; year?: string | number; site?: string }[]): SourceItem[] {
  const out: SourceItem[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    if (!s?.url) continue;
    const norm = normalizeUrl(s.url);
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push({
      title: s.title?.trim() || norm,
      url: norm,
      author: s.author,
      site: s.site || hostFromUrl(norm),
      year: s.year,
    });
  }
  return out;
}
