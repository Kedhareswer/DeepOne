export type ProviderId = "openai" | "google" | "mistral" | "groq" | "anthropic" | "deepseek" | "perplexity";

export type ModelInfo = {
  id: string;
  label: string;
  tags?: string[]; // e.g., ["reasoning", "multimodal", "vision", "long-context"]
};

export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google Gemini" },
  { id: "mistral", label: "Mistral" },
  { id: "groq", label: "Groq" },
  { id: "anthropic", label: "Anthropic Claude" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "perplexity", label: "Perplexity Sonar" },
];

export const MODEL_OPTIONS: Record<ProviderId, ModelInfo[]> = {
  openai: [
    { id: "gpt-4o", label: "GPT-4o", tags: ["multimodal", "vision"] },
    { id: "gpt-4o-mini", label: "GPT-4o mini", tags: ["multimodal", "vision", "cost-efficient"] },
    { id: "gpt-4o-2024-08-06", label: "GPT-4o (2024-08-06)", tags: ["versioned", "multimodal"] },
    { id: "o4-mini", label: "o4-mini", tags: ["reasoning", "cost-efficient"] },
    { id: "o3-mini", label: "o3-mini", tags: ["reasoning"] },
    { id: "o1", label: "o1", tags: ["reasoning"] },
  ],
  google: [
    { id: "models/gemini-2.5-pro", label: "Gemini 2.5 Pro", tags: ["multimodal", "general"] },
    { id: "models/gemini-2.5-flash", label: "Gemini 2.5 Flash", tags: ["multimodal", "fast"] },
    { id: "models/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", tags: ["fast", "cost-efficient"] },
    { id: "models/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash (Preview 05-20)", tags: ["preview"] },
    { id: "models/gemini-2.0-flash", label: "Gemini 2.0 Flash", tags: ["multimodal", "previous-gen"] },
    { id: "models/gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", tags: ["small", "fast"] },
  ],
  mistral: [
    { id: "mistral-large-latest", label: "Mistral Large", tags: ["general"] },
    { id: "mistral-small-latest", label: "Mistral Small", tags: ["fast", "cost-efficient"] },
    { id: "magistral-small-latest", label: "Magistral Small (latest)", tags: ["reasoning", "small"] },
    { id: "mistral-small-3.2", label: "Mistral Small 3.2", tags: ["small", "fast"] },
    { id: "devstral-small-1.1", label: "Devstral Small 1.1", tags: ["tools", "small"] },
    { id: "voxtral-small", label: "Voxtral Small", tags: ["audio", "multimodal"] },
    { id: "voxtral-mini", label: "Voxtral Mini", tags: ["audio", "mini"] },
    { id: "pixtral-large-latest", label: "Pixtral Large", tags: ["vision", "multimodal"] },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", tags: ["fast", "general"] },
    { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile", tags: ["fast", "general"] },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", tags: ["fast", "small"] },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7b", tags: ["fast", "mixture-of-experts"] },
    { id: "gemma2-9b-it", label: "Gemma2 9B IT", tags: ["google", "instruction"] },
    { id: "llama3-groq-70b-8192-tool-use-preview", label: "Llama3 Groq 70B Tool-Use (preview)", tags: ["tools", "preview"] },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B Instruct", tags: ["llama4", "instruct"] },
    { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B Instruct", tags: ["llama4", "instruct"] },
    // GPT-OSS models hosted by Groq
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (hosted by Groq)", tags: ["open-weights", "reasoning", "hosted-by-groq"] },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B (hosted by Groq)", tags: ["open-weights", "hosted-by-groq"] },
    // Groq systems
    { id: "groq/compound", label: "Groq Compound", tags: ["system", "tools", "web-search", "code-exec"] },
    { id: "groq/compound-mini", label: "Groq Compound Mini", tags: ["system", "tools", "web-search", "code-exec"] },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (2025-05-14)", tags: ["reasoning", "latest"] },
    { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet (latest)", tags: ["reasoning", "vision"] },
    { id: "claude-3-opus-latest", label: "Claude 3 Opus (latest)", tags: ["reasoning"] },
    { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (latest)", tags: ["fast", "vision"] },
  ],
  deepseek: [
    { id: "deepseek-chat", label: "DeepSeek Chat", tags: ["general"] },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner", tags: ["reasoning"] },
    { id: "deepseek-r1-0528", label: "DeepSeek R1-0528", tags: ["reasoning", "release-0528"] },
  ],
  perplexity: [
    { id: "llama-3.1-sonar-small-128k-online", label: "Sonar Small 128k Online", tags: ["online", "search", "small"] },
    { id: "llama-3.1-sonar-large-128k-online", label: "Sonar Large 128k Online", tags: ["online", "search", "large"] },
    { id: "llama-3.1-sonar-small-128k-chat", label: "Sonar Small 128k Chat", tags: ["chat", "small"] },
    { id: "llama-3.1-sonar-large-128k-chat", label: "Sonar Large 128k Chat", tags: ["chat", "large"] },
    { id: "llama-3.1-70b-instruct", label: "Llama 3.1 70B Instruct", tags: ["instruct", "70b"] },
    { id: "llama-3.1-8b-instruct", label: "Llama 3.1 8B Instruct", tags: ["instruct", "8b"] },
    { id: "sonar-deep-research", label: "Sonar Deep Research", tags: ["research", "online"] },
  ],
};

export function defaultModelFor(provider: ProviderId): string {
  return MODEL_OPTIONS[provider][0].id;
}
