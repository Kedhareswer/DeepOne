import { requireApiKey } from "@/lib/middleware/auth";
import { ingestLocalDocs } from "@/lib/ingest/files";
import { getIndexStats } from "@/lib/vector/json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;

  const root = new URL(req.url).searchParams.get("root") || "my-docs";
  try {
    const res = await ingestLocalDocs(root);
    const stats = await getIndexStats();
    return new Response(JSON.stringify({ ok: true, ...res, stats }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error)?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: Request) {
  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;
  try {
    const stats = await getIndexStats();
    return new Response(JSON.stringify({ ok: true, stats }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error)?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
