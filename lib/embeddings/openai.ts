export async function embedTexts(
  texts: string[],
  {
    model = process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    apiKey = process.env.OPENAI_API_KEY,
  }: { model?: string; apiKey?: string } = {},
): Promise<number[][]> {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY for embeddings");
  if (!Array.isArray(texts) || texts.length === 0) return [];

  // OpenAI embeddings API accepts up to ~2048 inputs depending on size; we batch conservatively.
  const BATCH = 64;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: batch }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings error ${res.status}`);
    const json = await res.json();
    const vectors: number[][] = json.data.map((d: any) => d.embedding);
    out.push(...vectors);
  }
  return out;
}
