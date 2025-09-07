import { openai, createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function ensureDir(p: string) {
  return fs.mkdir(p, { recursive: true }).catch(() => {});
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

// -----------------------------
// Minimal multi-agent pipeline
// -----------------------------
import { retrieveWithFallback } from "@/lib/retrievers/fallback";
import { tavilyRetriever } from "@/lib/retrievers/tavily";
import { ddgRetriever } from "@/lib/retrievers/ddg";
import { googleCSERetriever } from "@/lib/retrievers/google-cse";
import { bingRetriever } from "@/lib/retrievers/bing";
import { langSearchRetriever } from "@/lib/retrievers/langsearch";
import { requireApiKey } from "@/lib/middleware/auth";
import { dedupeAndEnrich } from "@/lib/citations/validate";
import { formatCitations, type CitationStyle } from "@/lib/citations/format";
import { searchIndex } from "@/lib/vector/json";
import { exportPdfFromMarkdown } from "@/lib/export/pdf";
import { exportDocxFromMarkdown } from "@/lib/export/docx";

type Plan = {
  subQuestions: string[];
  notes?: string;
};

async function selectModel(provider: string, model: string) {
  if (provider === "openai") return openai(model);
  if (provider === "groq")
    return createOpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai" })(model);
  if (provider === "anthropic") {
    try {
      // @ts-ignore: optional dependency, imported dynamically
      const mod = await import("@ai-sdk/anthropic");
      return mod.anthropic(model);
    } catch {
      throw new Error(`Anthropic provider failed: @ai-sdk/anthropic not installed. Install with: npm i @ai-sdk/anthropic`);
    }
  }
  if (provider === "google") {
    try {
      const mod = await import("@ai-sdk/google");
      return mod.google(model);
    } catch {
      throw new Error(`Google provider failed: @ai-sdk/google not installed. Install with: npm i @ai-sdk/google`);
    }
  }
  if (provider === "mistral") {
    try {
      const mod = await import("@ai-sdk/mistral");
      return mod.mistral(model);
    } catch {
      throw new Error(`Mistral provider failed: @ai-sdk/mistral not installed. Install with: npm i @ai-sdk/mistral`);
    }
  }
  if (provider === "deepseek") {
    const deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    return deepseek(model);
  }
  if (provider === "perplexity") {
    const pplx = createOpenAI({
      apiKey: process.env.PPLX_API_KEY,
      baseURL: "https://api.perplexity.ai",
    });
    return pplx(model);
  }
  throw new Error(`Unsupported provider: ${provider}. Check your provider selection.`);
}

async function plannerAgent(modelFn: any, task: string): Promise<Plan> {
  const prompt = `You are the Planner Agent. Break the task into 3-5 concrete sub-questions optimal for web+document research. Reply ONLY in compact JSON with keys {"subQuestions": string[], "notes": string}.
Task: ${task}`;
  const res = await generateText({ model: modelFn, prompt });
  const text = res.text ?? "";
  try {
    const json = JSON.parse(text);
    const subs = Array.isArray(json.subQuestions) ? json.subQuestions.map((s: any) => String(s)).filter(Boolean) : [];
    return { subQuestions: subs.slice(0, 6), notes: typeof json.notes === "string" ? json.notes : undefined };
  } catch {
    // fallback: split by newline
    const subs = text.split(/\n+/).map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 5);
    return { subQuestions: subs };
  }
}

async function executeRetrieval(subQuestions: string[], maxResults: number, timeoutMs: number) {
  const concurrency = Math.max(1, Number(process.env.DEEP_RESEARCH_CONCURRENCY ?? 4));
  const queue = [...subQuestions];
  const aggregated: { title: string; url: string; content?: string }[] = [];
  const seen = new Set<string>();

  async function worker() {
    while (queue.length) {
      const q = queue.shift()!;
      const res = await retrieveWithFallback(
        q,
        [
          { name: "langsearch", fn: langSearchRetriever, rps: 3, burst: 6 },
          { name: "tavily", fn: tavilyRetriever, rps: 3, burst: 6 },
          { name: "google_cse", fn: googleCSERetriever, rps: 1, burst: 2 },
          { name: "bing", fn: bingRetriever, rps: 1, burst: 2 },
          { name: "duckduckgo", fn: ddgRetriever, rps: 2, burst: 4 },
        ],
        { maxResults, timeoutMs },
      );
      if (res?.results?.length) {
        for (const r of res.results) {
          if (!r.url || seen.has(r.url)) continue;
          seen.add(r.url);
          aggregated.push({ title: r.title, url: r.url, content: r.content });
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return aggregated.slice(0, maxResults * Math.max(1, subQuestions.length));
}

async function writerAgent(modelFn: any, task: string, language: string, reportType: string, totalWords: number, sources: { title: string; url: string; content?: string }[]) {
  const refs = sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n");
  const prompt = `You are the Writer Agent for DeepOne. Write a ${reportType.replace(/_/g, " ")} in ${language} of about ${totalWords} words.
Use ONLY the following sources as factual grounding. Attribute claims with bracket citations like [1], [2]. Do NOT include a References section; it will be appended programmatically.

Topic: ${task}

Sources:\n${refs || "(no sources)"}`;
  const res = await generateText({ model: modelFn, prompt });
  return res.text ?? "";
}

export async function POST(req: Request) {
  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  const {
    task,
    report_type = "research_report",
    language = "english",
    provider = "openai",
    model = "gpt-4o",
    max_results,
    total_words,
    timeout_ms,
    formats,
    citation_style,
    include_local,
    rag_top_k,
  } = body ?? {};

  if (!task || typeof task !== "string") {
    return new Response(JSON.stringify({ error: "Missing 'task' string" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Early env check for clearer errors
  const requiredEnvByProvider: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
    mistral: "MISTRAL_API_KEY",
    groq: "GROQ_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    perplexity: "PPLX_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
  };
  const required = requiredEnvByProvider[provider];
  if (required && !process.env[required]) {
    return new Response(
      JSON.stringify({ error: `Missing ${required} for provider '${provider}'. Set it in your .env or switch provider.` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const modelFn = await selectModel(provider, model);

  const MAX_RESULTS = Math.max(
    1,
    Math.min(20, Number(max_results ?? process.env.MAX_SEARCH_RESULTS_PER_QUERY ?? 5)),
  );
  const TOTAL_WORDS = Math.max(
    300,
    Number(total_words ?? process.env.TOTAL_WORDS ?? 1200),
  );
  const TIMEOUT_MS = Math.max(3000, Number(timeout_ms ?? process.env.REQUEST_TIMEOUT ?? 120000));
  const FORMATS = Array.isArray(formats) ? (formats as string[]) : ["md"]; // md, pdf, docx
  const CITATION_STYLE: CitationStyle = (citation_style === "MLA" ? "MLA" : "APA");
  const INCLUDE_LOCAL = include_local !== false; // default true
  const RAG_TOP_K = Math.max(1, Number(rag_top_k ?? 10));

  // 1) Planning
  const plan = await plannerAgent(modelFn, task);
  const subQuestions = plan.subQuestions.length ? plan.subQuestions : [task];

  // 2) Execution (retrieval with fallback)
  const aggregated = await executeRetrieval(subQuestions, MAX_RESULTS, TIMEOUT_MS);

  // 2b) Local RAG (optional)
  let localMatches: { title: string; url: string; content?: string }[] = [];
  if (INCLUDE_LOCAL) {
    const local = await searchIndex(task, RAG_TOP_K);
    localMatches = (local || []).map((m, i) => ({
      title: (m.meta?.path ? `${m.meta.path}` : `Local chunk ${i + 1}`),
      url: m.meta?.path ? `file://${m.meta.path}` : `local://chunk-${m.id}`,
      content: m.text,
    }));
  }

  // 3) Writing
  const reportBody = await writerAgent(
    modelFn,
    task,
    language,
    report_type,
    TOTAL_WORDS,
    [...aggregated, ...localMatches],
  );

  // Build a consistent References section from all sources
  const allSources = [...aggregated, ...localMatches].map((s) => ({ title: s.title, url: s.url }));
  const refs = formatCitations(CITATION_STYLE, dedupeAndEnrich(allSources));
  const reportText = `${reportBody}\n\nReferences\n${refs ? refs : "(No references)"}`;

  // Persist to outputs/reports
  const outDir = path.join(process.cwd(), "outputs", "reports");
  await ensureDir(outDir);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${ts}-${toSlug(task) || "report"}`;
  const fname = `${base}.md`;
  const fullPath = path.join(outDir, fname);
  await fs.writeFile(fullPath, reportText, "utf8");

  // Optional exports
  const outputs: Record<string, string> = { md: `/api/reports/${encodeURIComponent(fname)}` };
  if (FORMATS.includes("pdf")) {
    try {
      const pdfPath = path.join(outDir, `${base}.pdf`);
      await exportPdfFromMarkdown(reportText, pdfPath);
      outputs.pdf = `/api/reports/${encodeURIComponent(`${base}.pdf`)}`;
    } catch (e) {
      // ignore export failure to not break main flow
    }
  }
  if (FORMATS.includes("docx")) {
    try {
      const docxPath = path.join(outDir, `${base}.docx`);
      await exportDocxFromMarkdown(reportText, docxPath);
      outputs.docx = `/api/reports/${encodeURIComponent(`${base}.docx`)}`;
    } catch (e) {
      // ignore
    }
  }

  return new Response(
    JSON.stringify({
      id: fname,
      path: `/api/reports/${encodeURIComponent(fname)}`,
      words_target: TOTAL_WORDS,
      max_results: MAX_RESULTS,
      provider,
      model,
      sub_questions: subQuestions,
      sources_used: aggregated.length,
      local_used: localMatches.length,
      outputs,
      saved: true,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
