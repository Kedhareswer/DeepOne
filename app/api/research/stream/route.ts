import { openai, createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const runtime = "nodejs";

function sseEncode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

async function selectModel(provider: string, model: string) {
  if (provider === "openai") return openai(model);
  if (provider === "groq")
    return createOpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai" })(model);
  if (provider === "anthropic") {
    try {
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

import { retrieveWithFallback } from "@/lib/retrievers/fallback";
import { tavilyRetriever } from "@/lib/retrievers/tavily";
import { ddgRetriever } from "@/lib/retrievers/ddg";
import { googleCSERetriever } from "@/lib/retrievers/google-cse";
import { bingRetriever } from "@/lib/retrievers/bing";
import { langSearchRetriever } from "@/lib/retrievers/langsearch";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const task = url.searchParams.get("task") || "";
  const provider = url.searchParams.get("provider") || "openai";
  const model = url.searchParams.get("model") || "gpt-4o";
  const MAX_RESULTS = Math.max(1, Math.min(20, Number(url.searchParams.get("max") ?? process.env.MAX_SEARCH_RESULTS_PER_QUERY ?? 5)));
  const TOTAL_WORDS = Math.max(300, Number(url.searchParams.get("words") ?? process.env.TOTAL_WORDS ?? 1200));
  const TIMEOUT_MS = Math.max(3000, Number(url.searchParams.get("timeout") ?? process.env.REQUEST_TIMEOUT ?? 120000));
  const apiKeyParam = url.searchParams.get("apiKey");

  // Optional API key enforcement to support EventSource (no custom headers)
  const allowed = (process.env.API_KEYS || "").split(/[\s,]+/).filter(Boolean);
  if (allowed.length > 0) {
    const hdr = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
    const token = hdr || apiKeyParam || "";
    if (!allowed.includes(token)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!task) {
    return new Response("Missing task", { status: 400 });
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(evt: unknown) {
        controller.enqueue(encoder.encode(sseEncode(evt)));
      }
      try {
        send({ type: "status", phase: "planning", message: "Planning sub-questions" });
        const modelFn = await selectModel(provider, model);
        const planPrompt = `You are the Planner Agent. Break the task into 3-5 concrete sub-questions optimal for web+document research. Reply ONLY in compact JSON with keys {"subQuestions": string[]}.\nTask: ${task}`;
        const planRes = await generateText({ model: modelFn, prompt: planPrompt });
        let subs: string[] = [];
        try {
          subs = JSON.parse(planRes.text || "{}").subQuestions || [];
        } catch {
          subs = (planRes.text || "").split(/\n+/).map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 5);
        }
        if (!subs.length) subs = [task];
        send({ type: "phase", phase: "planning", done: true, subQuestions: subs });

        send({ type: "status", phase: "executing", message: "Retrieving sources" });
        const concurrency = Math.max(1, Number(process.env.DEEP_RESEARCH_CONCURRENCY ?? 4));
        const queue = [...subs];
        const aggregated: { title: string; url: string; content?: string }[] = [];
        const seen = new Set<string>();
        let completed = 0;
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
              { maxResults: MAX_RESULTS, timeoutMs: TIMEOUT_MS },
            );
            if (res?.results?.length) {
              for (const r of res.results) {
                if (!r.url || seen.has(r.url)) continue;
                seen.add(r.url);
                aggregated.push({ title: r.title, url: r.url, content: r.content });
              }
            }
            completed++;
            send({ type: "progress", phase: "executing", completed, total: subs.length });
          }
        }
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
        send({ type: "phase", phase: "executing", done: true, sources: aggregated.length });

        send({ type: "status", phase: "writing", message: "Composing report" });
        const refs = aggregated.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n");
        const writePrompt = `You are the Writer Agent for DeepOne. Write a research report of about ${TOTAL_WORDS} words. Use ONLY these sources and cite with [1], [2]. End with a References section.\n\nTopic: ${task}\n\nSources:\n${refs}`;
        const writeRes = await generateText({ model: modelFn, prompt: writePrompt });
        const reportText = writeRes.text || "";
        send({ type: "phase", phase: "writing", done: true });

        send({ type: "completed", message: "Report composed", wordsTarget: TOTAL_WORDS, sources: aggregated.length, preview: reportText.slice(0, 500) });
        controller.close();
      } catch (e: unknown) {
        send({ type: "error", message: (e as Error)?.message || String(e) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
