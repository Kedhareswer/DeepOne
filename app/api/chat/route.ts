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
  const deepResearch = url.searchParams.get("deepResearch") === "true";

  const { messages }: { messages: UIMessage[] } = await req.json();

  // If Deep Research mode is enabled, use research generation instead
  if (deepResearch) {
    return handleDeepResearchChat(req, provider, modelId, maxParam, wordsParam, messages);
  }

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

// Handle Deep Research chat mode
async function handleDeepResearchChat(
  req: Request,
  provider: string,
  modelId: string,
  maxParam: string | null,
  wordsParam: string | null,
  messages: UIMessage[]
) {
  // Get the last user message as the research task
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  
  if (!lastUserMessage) {
    return new Response(
      JSON.stringify({ error: "No research task provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Extract text content from the message
  const modelMessages = convertToModelMessages([lastUserMessage]);
  const lastMsg = modelMessages[0];
  let task = "";
  
  if (lastMsg && lastMsg.content) {
    if (typeof lastMsg.content === "string") {
      task = lastMsg.content;
    } else if (Array.isArray(lastMsg.content)) {
      task = lastMsg.content
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join(" ");
    }
  }

  if (!task) {
    return new Response(
      JSON.stringify({ error: "No research task text found" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const maxResults = Math.max(1, Math.min(20, Number(maxParam ?? 5)));
  const totalWords = Math.max(300, Number(wordsParam ?? 1200));

  // Use the research streaming endpoint directly
  const researchUrl = new URL("/api/research/stream", new URL(req.url).origin);
  researchUrl.searchParams.set("task", task);
  researchUrl.searchParams.set("provider", provider);
  researchUrl.searchParams.set("model", modelId);
  researchUrl.searchParams.set("max", String(maxResults));
  researchUrl.searchParams.set("words", String(totalWords));

  try {
    // Create a streaming response that formats research SSE as chat stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(researchUrl.toString());
          if (!response.ok) {
            throw new Error(`Research API failed: ${response.statusText}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let buffer = "";
          let reportContent = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === "completed" && data.preview) {
                    reportContent = data.preview;
                    // Send as chat completion
                    const chunk = JSON.stringify({
                      type: "text-delta",
                      textDelta: reportContent
                    });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                  } else if (data.type === "status" || data.type === "progress") {
                    // Send status updates as deltas
                    const statusText = `\n\n*${data.message || `${data.phase}: ${data.completed || 0}/${data.total || 0}`}*\n\n`;
                    const chunk = JSON.stringify({
                      type: "text-delta",
                      textDelta: statusText
                    });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
          
          // Send completion
          const finishChunk = JSON.stringify({ type: "finish", finish_reason: "stop" });
          controller.enqueue(encoder.encode(`data: ${finishChunk}\n\n`));
          
        } catch (error) {
          const errorChunk = JSON.stringify({
            type: "error",
            error: `Research failed: ${error}`
          });
          controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Research generation failed: ${error}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
