import fs from "fs";
import path from "path";

export async function exportPdfFromMarkdown(markdown: string, outPath: string): Promise<string> {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  // Dynamic import to avoid compile-time deps if package not installed yet
  // @ts-ignore - optional dependency; install types with: npm i -D @types/pdfkit
  const mod: any = await import("pdfkit").catch(() => null);
  if (!mod) {
    throw new Error("pdfkit is not installed. Run: npm i pdfkit");
  }
  const PDFDocument = mod.default ?? mod;
  const doc = new PDFDocument({ autoFirstPage: true, margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // A very simple markdown-to-text: keep headings and code fences as text blocks
  const lines = markdown.split(/\n/);
  for (const line of lines) {
    if (/^#\s+/.test(line)) {
      doc.moveDown(0.5).fontSize(18).text(line.replace(/^#\s+/, ""), { bold: true });
      doc.moveDown(0.25).fontSize(12);
    } else if (/^##\s+/.test(line)) {
      doc.moveDown(0.5).fontSize(16).text(line.replace(/^##\s+/, ""));
      doc.moveDown(0.25).fontSize(12);
    } else if (/^```/.test(line)) {
      // Start/End code block marker -> add a separator line
      doc.moveDown(0.25).fontSize(10).text(line);
    } else {
      doc.fontSize(12).text(line || " ", { continued: false });
    }
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  return outPath;
}
