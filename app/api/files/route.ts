import fs from "fs/promises";
import path from "path";

export async function GET() {
  const docsDir = path.join(process.cwd(), "my-docs");
  try {
    await fs.mkdir(docsDir, { recursive: true });
    const entries = await fs.readdir(docsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((d) => d.isFile())
        .map(async (d) => {
          const full = path.join(docsDir, d.name);
          const stat = await fs.stat(full);
          return {
            name: d.name,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          };
        }),
    );

    return new Response(JSON.stringify({ files }), {
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
