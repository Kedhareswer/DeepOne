import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/report/[id]'>
) {
  const { id } = await ctx.params;
  const outDir = path.join(process.cwd(), "outputs", "reports");
  const full = path.join(outDir, id);
  try {
    const data = await fs.readFile(full);
    const contentType = full.endsWith(".md")
      ? "text/markdown; charset=utf-8"
      : "application/octet-stream";
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${id}"`,
      },
    });
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || String(e) }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
