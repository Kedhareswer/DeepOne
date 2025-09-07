"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PROVIDERS, MODEL_OPTIONS, defaultModelFor, type ProviderId, type ModelInfo } from "@/lib/models";


export const Assistant = () => {
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>(defaultModelFor("openai"));
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[] | null>(null);
  const [providersLoaded, setProvidersLoaded] = useState<boolean>(false);
  const [maxResults, setMaxResults] = useState<number>(5);
  const [wordCount, setWordCount] = useState<number>(1200);

  // Reset model to the first available when provider changes
  useEffect(() => {
    setModel(defaultModelFor(provider));
  }, [provider]);

  // Discover enabled providers from server and set default (prefer Groq)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/providers");
        if (!res.ok) throw new Error("providers fetch failed");
        const json = await res.json();
        const list = Array.isArray(json.enabled) ? json.enabled.filter(Boolean) : [];
        if (!alive) return;
        setEnabledProviders(list as ProviderId[]);
        if (json.default && json.default !== provider) {
          setProvider(json.default as ProviderId);
          setModel(defaultModelFor(json.default as ProviderId));
        }
        setProvidersLoaded(true);
      } catch {
        // ignore; keep defaults
        setEnabledProviders([]);
        setProvidersLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: providersLoaded ? `/api/chat?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}&max=${encodeURIComponent(String(maxResults))}&words=${encodeURIComponent(String(wordCount))}` : undefined,
    }),
  });

  if (!providersLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading providers...</div>
        </div>
      </div>
    );
  }

  if (enabledProviders?.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No Providers Configured</div>
          <div className="text-sm text-muted-foreground">Configure API keys in .env to enable providers</div>
        </div>
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="provider" className="text-sm text-muted-foreground">
                    Provider
                  </label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ProviderId)}
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    {enabledProviders && enabledProviders.length === 0 && (
                      <option value="" disabled>
                        Configure provider API keys in .env
                      </option>
                    )}
                    {enabledProviders && enabledProviders.length > 0
                      ? enabledProviders
                          .map((pid) => PROVIDERS.find((p) => p.id === pid))
                          .filter(Boolean)
                          .map((p) => (
                            <option key={(p as any).id} value={(p as any).id}>
                              {(p as any).label}
                            </option>
                          ))
                      : null}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="model" className="text-sm text-muted-foreground">
                    Model
                  </label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    {MODEL_OPTIONS[provider].map((m: ModelInfo) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const info = MODEL_OPTIONS[provider].find((m: ModelInfo) => m.id === model);
                    return info?.tags?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {info.tags.map((t) => (
                          <span key={t} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <label htmlFor="max" className="text-sm text-muted-foreground">
                    Max results
                  </label>
                  <input
                    id="max"
                    type="number"
                    min={1}
                    max={20}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className="h-8 w-20 rounded-md border bg-background px-2 text-sm"
                  />
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <label htmlFor="words" className="text-sm text-muted-foreground">
                    Words
                  </label>
                  <input
                    id="words"
                    type="number"
                    min={300}
                    step={100}
                    value={wordCount}
                    onChange={(e) => setWordCount(Math.max(300, Number(e.target.value) || 300))}
                    className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
                  />
                </div>
              </div>
              <div className="ml-auto">
                <Link href="/settings" className="text-sm text-primary underline">
                  Settings
                </Link>
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
