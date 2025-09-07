import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { addDocuments } from "@/lib/vector/json";

export async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function chunkText(text: string, maxLen = 1200): string[] {
  const lines = text.split(/\n/);
  const chunks: string[] = [];
  let buf: string[] = [];
  let len = 0;
  for (const line of lines) {
    const l = line.length + 1;
    if (len + l > maxLen && buf.length) {
      chunks.push(buf.join("\n"));
      buf = [];
      len = 0;
    }
    buf.push(line);
    len += l;
  }
  if (buf.length) chunks.push(buf.join("\n"));
  return chunks;
}

async function extractText(file: string, ext: string): Promise<string | null> {
  try {
    if (ext === ".pdf") {
      // @ts-ignore - optional dependency
      const pdfParse = (await import("pdf-parse")).default ?? (await import("pdf-parse"));
      const buf = await fs.readFile(file);
      const out = await pdfParse(buf);
      return String(out.text || "").trim();
    }
    if (ext === ".docx") {
      // @ts-ignore - optional dependency
      const mammoth = await import("mammoth").catch(() => null);
      if (!mammoth) return null;
      const buf = await fs.readFile(file);
      const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const res = await mammoth.extractRawText({ arrayBuffer } as any);
      return String(res.value || "").trim();
    }
  } catch {
    return null;
  }
  return null;
}

export async function ingestLocalDocs(rootDir: string): Promise<{ files: number; chunks: number }> {
  let files = 0;
  let chunksTotal = 0;
  const docs: { id: string; text: string; meta?: Record<string, any> }[] = [];

  for await (const file of walk(rootDir)) {
    const ext = path.extname(file).toLowerCase();
    if (![".md", ".txt", ".csv", ".pdf", ".docx"].includes(ext)) continue;
    try {
      let text: string | null = null;
      if (ext === ".md" || ext === ".txt" || ext === ".csv") {
        text = await fs.readFile(file, "utf8");
      } else {
        text = await extractText(file, ext);
      }
      if (!text) continue;
      const chunks = chunkText(text);
      const baseId = crypto.createHash("sha1").update(file).digest("hex").slice(0, 12);
      chunks.forEach((chunk, i) => {
        const id = `${baseId}-${i}`;
        docs.push({ id, text: chunk, meta: { path: file, chunk: i } });
      });
      files += 1;
      chunksTotal += chunks.length;
    } catch {
      // skip unreadable file
    }
  }

  if (docs.length) {
    await addDocuments(docs);
  }
  return { files, chunks: chunksTotal };
}
