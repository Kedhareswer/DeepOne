import { openai, createOpenAI } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages, CoreMessage } from "ai";
import { tavilySearch } from "@/lib/tavily";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "google";
  const modelId = url.searchParams.get("model") ?? "gemini-1.5-flash";
  const maxParam = url.searchParams.get("max");
  const wordsParam = url.searchParams.get("words");

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Early env check for clearer errors
  const requiredEnvByProvider: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
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

  // Provider selection
  let model;
  switch (provider) {
    case "openai":
      model = openai(modelId);
      break;
    case "anthropic":
      try {
        const mod = await import("@ai-sdk/anthropic");
        model = mod.anthropic(modelId);
      } catch {
        throw new Error(`Anthropic provider failed: @ai-sdk/anthropic not installed or invalid. Install with: npm i @ai-sdk/anthropic`);
      }
      break;
    case "google":
      try {
        const mod = await import("@ai-sdk/google");
        model = mod.google(modelId);
      } catch {
        throw new Error(`Google provider failed: @ai-sdk/google not installed or invalid. Install with: npm i @ai-sdk/google`);
      }
      break;
    case "mistral":
      try {
        const mod = await import("@ai-sdk/mistral");
        model = mod.mistral(modelId);
      } catch {
        throw new Error(`Mistral provider failed: @ai-sdk/mistral not installed or invalid. Install with: npm i @ai-sdk/mistral`);
      }
      break;
    case "groq": {
      const groq = createOpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
      model = groq(modelId);
      break;
    }
    case "deepseek": {
      const deepseek = createOpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com/v1",
      });
      model = deepseek(modelId);
      break;
    }
    case "perplexity": {
      const pplx = createOpenAI({
        apiKey: process.env.PPLX_API_KEY,
        baseURL: "https://api.perplexity.ai",
      });
      model = pplx(modelId);
      break;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}. Check your provider selection.`);
  }

  // PRD-aligned: First-turn web research using Tavily and citation-rich report
  const uiMessages = messages ?? [];
  const modelMessages = convertToModelMessages(uiMessages);
  const hasAssistantMessage = modelMessages.some((m) => m.role === "assistant");
  const lastUserMsg = [...modelMessages]
    .reverse()
    .find((m) => m.role === "user");
  let lastUserText: string | undefined = undefined;
  if (lastUserMsg) {
    const c = lastUserMsg.content;
    if (typeof c === "string") lastUserText = c;
    else if (Array.isArray(c)) {
      lastUserText = c
        .filter((p): p is { type: "text"; text: string } => p?.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n");
    }
  }

  const MAX_RESULTS = Math.max(
    1,
    Math.min(
      20,
      Number(maxParam ?? process.env.MAX_SEARCH_RESULTS_PER_QUERY ?? 5),
    ),
  );
  const TOTAL_WORDS = Math.max(
    300,
    Number(wordsParam ?? process.env.TOTAL_WORDS ?? 1200),
  );

  let prefixMessages: CoreMessage[] = [];
  try {
    if (!hasAssistantMessage && lastUserText) {
      // Attempt web search if Tavily key is present
      const search = await tavilySearch(String(lastUserText), {
        maxResults: MAX_RESULTS,
        searchDepth: "advanced",
        includeAnswer: true,
      });

      const references = search.results
        .slice(0, MAX_RESULTS)
        .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}`)
        .join("\n");

      const systemIntro = `You are DeepOne, an advanced AI research assistant specializing in comprehensive, structured analysis. Create detailed, well-organized research reports with the following enhanced format:

## RESPONSE STRUCTURE:
1. **Executive Summary** (2-3 sentences highlighting key findings)
2. **Current State Analysis** (detailed overview with statistics/data)
3. **Key Applications & Use Cases** (specific examples with real-world implementations)
4. **Benefits & Advantages** (quantified impacts where possible)
5. **Challenges & Limitations** (honest assessment with mitigation strategies)
6. **Future Trends & Predictions** (evidence-based projections)
7. **Comparative Analysis** (tables/comparisons where relevant)
8. **Practical Examples** (case studies, implementation scenarios)
9. **Key Takeaways** (bullet points of essential insights)
10. **References** (properly formatted with URLs)

## ENHANCED REQUIREMENTS:
- Target ${TOTAL_WORDS} words with rich detail and examples
- Use **bold formatting** for key terms and section headers
- Include specific statistics, percentages, and quantifiable data
- Provide concrete examples and case studies
- Create comparison tables when analyzing multiple options
- Use bullet points and numbered lists for clarity
- Ground every claim with citations [1], [2], etc.
- Maintain objective, professional tone
- Include practical implementation guidance
- Add relevant market data, trends, and projections

## FORMATTING GUIDELINES:
- Use markdown formatting extensively
- Create tables for data comparisons
- Use code blocks for technical examples
- Include relevant emojis sparingly for visual appeal
- Structure information hierarchically
- Ensure high readability and scanability`;

      const findingsBlock = `Findings:\n${references}`;

      prefixMessages = [
        { role: "system", content: systemIntro },
        { role: "system", content: findingsBlock },
      ];
    }
  } catch {
    // If Tavily isn't configured or fails, continue without findings
    prefixMessages = [
      {
        role: "system",
        content:
          "You are DeepOne, a meticulous research assistant. If web findings are not provided, answer to the best of your knowledge and clearly state assumptions. Include a References section if you cite sources.",
      },
    ];
  }

  const result = streamText({
    model,
    messages: [...prefixMessages, ...convertToModelMessages(uiMessages)],
  });

  return result.toUIMessageStreamResponse();
}
