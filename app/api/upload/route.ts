import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function safeName(name: string) {
  return name.replace(/[^a-z0-9.\-_]+/gi, "-").slice(0, 128);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "missing file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const docsDir = path.join(process.cwd(), "my-docs");
    await fs.mkdir(docsDir, { recursive: true });

    const name = safeName(file.name || `upload-${Date.now()}`);
    const full = path.join(docsDir, name);
    await fs.writeFile(full, buffer);

    return new Response(
      JSON.stringify({ ok: true, name, path: `/api/files` }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
