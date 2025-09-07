import fs from "fs/promises";
import path from "path";
import { embedTexts } from "@/lib/embeddings/openai";

export type VectorItem = {
  id: string;
  text: string;
  embedding: number[];
  meta?: Record<string, unknown>;
};

export type VectorIndex = {
  version: number;
  items: VectorItem[];
  updatedAt?: string; // ISO timestamp of last update
};

const DEFAULT_INDEX_PATH = path.join(process.cwd(), "outputs", "index.json");

export async function loadIndex(indexPath: string = DEFAULT_INDEX_PATH): Promise<VectorIndex> {
  try {
    const buf = await fs.readFile(indexPath, "utf8");
    const json = JSON.parse(buf);
    if (!json.items) return { version: 1, items: [], updatedAt: new Date().toISOString() };
    return json as VectorIndex;
  } catch {
    return { version: 1, items: [], updatedAt: undefined };
  }
}

export async function saveIndex(index: VectorIndex, indexPath: string = DEFAULT_INDEX_PATH) {
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  index.updatedAt = new Date().toISOString();
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}

export async function addDocuments(
  docs: { id: string; text: string; meta?: Record<string, unknown> }[],
  indexPath: string = DEFAULT_INDEX_PATH,
) {
  const index = await loadIndex(indexPath);
  const embeddings = await embedTexts(docs.map((d) => d.text));
  for (let i = 0; i < docs.length; i++) {
    index.items.push({ id: docs[i].id, text: docs[i].text, embedding: embeddings[i], meta: docs[i].meta });
  }
  await saveIndex(index, indexPath);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let an = 0;
  let bn = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    an += x * x;
    bn += y * y;
  }
  const denom = Math.sqrt(an) * Math.sqrt(bn);
  return denom ? dot / denom : 0;
}

export async function searchIndex(
  query: string,
  topK: number = 10,
  indexPath: string = DEFAULT_INDEX_PATH,
): Promise<(VectorItem & { score: number })[]> {
  const index = await loadIndex(indexPath);
  if (index.items.length === 0) return [];
  const [q] = await embedTexts([query]);
  const scored = index.items.map((it) => ({ ...it, score: cosine(q, it.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function getIndexStats(indexPath: string = DEFAULT_INDEX_PATH): Promise<{ exists: boolean; items: number; updatedAt?: string }> {
  try {
    const idx = await loadIndex(indexPath);
    return { exists: true, items: idx.items.length, updatedAt: idx.updatedAt };
  } catch {
    return { exists: false, items: 0 };
  }
}
