import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/reports/[id]'>
) {
  const { id } = await ctx.params;
  const fileId = id;
  const outDir = path.join(process.cwd(), "outputs", "reports");
  const full = path.join(outDir, fileId);
  try {
    const data = await fs.readFile(full);
    const contentType = full.endsWith(".md")
      ? "text/markdown; charset=utf-8"
      : "application/octet-stream";
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileId}"`,
      },
    });
  } catch (e: unknown) {
    return new NextResponse(JSON.stringify({ error: (e as Error)?.message || String(e) }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
