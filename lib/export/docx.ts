import fs from "fs";
import path from "path";

export async function exportDocxFromMarkdown(markdown: string, outPath: string): Promise<string> {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  const mod = await import("docx").catch(() => null);
  if (!mod) {
    throw new Error("docx is not installed. Run: npm i docx");
    }
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = mod;

    const paragraphs: InstanceType<typeof Paragraph>[] = [];
  const lines = markdown.split(/\n/);
  let inCode = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inCode = !inCode;
      paragraphs.push(new Paragraph({ text: line, spacing: { after: 120 } }));
      continue;
    }
    if (inCode) {
      paragraphs.push(new Paragraph({ text: line }));
      continue;
    }
    if (/^#\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^#\s+/, ""), heading: HeadingLevel.HEADING_1 }));
    } else if (/^##\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^##\s+/, ""), heading: HeadingLevel.HEADING_2 }));
    } else if (/^###\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^###\s+/, ""), heading: HeadingLevel.HEADING_3 }));
    } else if (line.trim().length === 0) {
      paragraphs.push(new Paragraph({ text: "" }));
    } else {
      paragraphs.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(outPath, buffer);
  return outPath;
}
