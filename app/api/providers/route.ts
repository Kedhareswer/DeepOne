import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PROVIDER_ENV: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  perplexity: "PPLX_API_KEY",
};

const PRIORITY: string[] = ["google", "groq", "mistral", "perplexity", "deepseek", "anthropic", "openai"];

export async function GET() {
  const enabled: string[] = Object.entries(PROVIDER_ENV)
    .filter(([, env]) => Boolean(process.env[env]))
    .map(([p]) => p)
    .sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b));

  const def = enabled.length ? enabled[0] : "google";

  return NextResponse.json({ enabled, default: def });
}
