export type CitationStyle = "APA" | "MLA";

export type SourceItem = {
  title: string;
  url: string;
  author?: string;
  year?: string | number;
  site?: string;
};

export function formatCitation(item: SourceItem, style: CitationStyle): string {
  const title = item.title?.trim() || item.url;
  const url = item.url;
  const year = item.year ? String(item.year) : "n.d.";
  const author = item.author || item.site || "";

  if (style === "APA") {
    // Very light APA-like: Author/Site. (Year). Title. URL
    const authorPart = author ? `${author}. ` : "";
    return `${authorPart}(${year}). ${title}. ${url}`.trim();
  } else {
    // MLA-like: Author/Site. "Title." Year, URL
    const authorPart = author ? `${author}. ` : "";
    return `${authorPart}"${title}." ${year}, ${url}`.trim();
  }
}

export function formatCitations(style: CitationStyle, sources: SourceItem[]): string {
  const lines = sources.map((s) => formatCitation(s, style));
  return lines.join("\n");
}
