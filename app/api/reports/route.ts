import fs from "fs/promises";
import path from "path";

export async function GET() {
  const outDir = path.join(process.cwd(), "outputs", "reports");
  try {
    await fs.mkdir(outDir, { recursive: true });
    const files = await fs.readdir(outDir);

    const entries = await Promise.all(
      files.map(async (name) => {
        const full = path.join(outDir, name);
        const stat = await fs.stat(full);
        return {
          id: name,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        };
      }),
    );

    return new Response(JSON.stringify({ reports: entries }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
