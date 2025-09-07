"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PROVIDERS, MODEL_OPTIONS, type ProviderId, defaultModelFor, type ModelInfo } from "@/lib/models";

export default function ResearchPage() {
  const [task, setTask] = useState("");
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>(defaultModelFor("openai"));
  const [maxResults, setMaxResults] = useState<number>(5);
  const [wordCount, setWordCount] = useState<number>(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [sseActive, setSseActive] = useState(false);
  const [sseLogs, setSseLogs] = useState<string[]>([]);
  const [ssePreview, setSsePreview] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const sseRef = useRef<EventSource | null>(null);
  const [formats, setFormats] = useState<{ md: boolean; pdf: boolean; docx: boolean }>({ md: true, pdf: false, docx: false });
  const [citationStyle, setCitationStyle] = useState<"APA" | "MLA">("APA");
  const [includeLocal, setIncludeLocal] = useState<boolean>(true);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState<boolean>(false);
  const [indexStats, setIndexStats] = useState<{ items: number; updatedAt?: string } | null>(null);
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[] | null>(null);

  useEffect(() => {
    setModel(defaultModelFor(provider));
  }, [provider]);

  const models = useMemo(() => MODEL_OPTIONS[provider], [provider]);

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
      } catch {
        setEnabledProviders([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setReportId(null);
    setReportText(null);
    try {
      const selectedFormats = [
        ...(formats.md ? ["md"] : []),
        ...(formats.pdf ? ["pdf"] : []),
        ...(formats.docx ? ["docx"] : []),
      ];

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          provider,
          model,
          max_results: maxResults,
          total_words: wordCount,
          formats: selectedFormats,
          citation_style: citationStyle,
          include_local: includeLocal,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setReportId(json.id);

      // Fetch back the report content for preview
      const fileRes = await fetch(`/api/reports/${encodeURIComponent(json.id)}`);
      const text = await fileRes.text();
      setReportText(text);
    } catch (err: unknown) {
      setError((err as Error)?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const onIngest = async () => {
    setIngestStatus(null);
    setIngestLoading(true);
    try {
      const res = await fetch(`/api/files/ingest`, {
        method: "POST",
        headers: apiKey ? { "X-API-Key": apiKey } : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setIngestStatus(`Indexed ${json.files} files, ${json.chunks} chunks`);
      if (json.stats) setIndexStats({ items: json.stats.items, updatedAt: json.stats.updatedAt });
    } catch (e: unknown) {
      setIngestStatus(`Ingest failed: ${(e as Error)?.message || String(e)}`);
    } finally {
      setIngestLoading(false);
    }
  };

  const fetchIndexStats = async () => {
    try {
      const res = await fetch(`/api/files/ingest`, {
        method: "GET",
        headers: apiKey ? { "X-API-Key": apiKey } : undefined,
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.stats) setIndexStats({ items: json.stats.items, updatedAt: json.stats.updatedAt });
    } catch {}
  };

  useEffect(() => {
    fetchIndexStats();
    // re-fetch when API key changes (if protected)
  }, [apiKey]);

  const startStreaming = () => {
    if (!task) return;
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
    }
    setSseActive(true);
    setSseLogs([]);
    setSsePreview(null);
    const url = new URL("/api/research/stream", window.location.origin);
    url.searchParams.set("task", task);
    url.searchParams.set("provider", provider);
    url.searchParams.set("model", model);
    url.searchParams.set("max", String(maxResults));
    url.searchParams.set("words", String(wordCount));
    if (apiKey) url.searchParams.set("apiKey", apiKey);

    const es = new EventSource(url.toString());
    sseRef.current = es;
    es.onmessage = (ev) => {
      try {
        const evt = JSON.parse(ev.data);
        if (evt.type === "completed" && evt.preview) {
          setSsePreview(String(evt.preview));
          setSseActive(false);
          es.close();
        } else if (evt.type === "error") {
          setError(String(evt.message || "Stream error"));
          setSseActive(false);
          es.close();
        } else {
          setSseLogs((logs) => [...logs, ev.data]);
        }
      } catch {
        setSseLogs((logs) => [...logs, ev.data]);
      }
    };
    es.onerror = () => {
      setSseActive(false);
      try { es.close(); } catch {}
    };
  };

  useEffect(() => {
    return () => {
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {}
      }
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to Chat
        </Link>
        <h1 className="text-2xl font-semibold">DeepOne Research</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Generate a citation-rich research report using web findings. Configure your provider, model, and parameters below.
      </p>

      <form onSubmit={onSubmit} className="mb-8 grid gap-4 rounded-lg border p-4">
        <div className="grid gap-2">
          <label htmlFor="task" className="text-sm text-muted-foreground">
            Research topic or question
          </label>
          <input
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., State of AI in 2025"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <label htmlFor="provider" className="text-sm text-muted-foreground">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="h-10 rounded-md border bg-background px-2 text-sm"
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
                      <option key={p!.id} value={p!.id}>
                        {p!.label}
                      </option>
                    ))
                : null}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="model" className="text-sm text-muted-foreground">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              {models.map((m: ModelInfo) => {
                const tagStr = m.tags?.length ? ` — [${m.tags.join(", ")}]` : "";
                return (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {tagStr}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid gap-2">
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
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div className="grid gap-2">
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
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <span className="text-sm text-muted-foreground">Formats</span>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={formats.md}
                  onChange={(e) => setFormats((f) => ({ ...f, md: e.target.checked }))}
                />
                md
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={formats.pdf}
                  onChange={(e) => setFormats((f) => ({ ...f, pdf: e.target.checked }))}
                />
                pdf
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={formats.docx}
                  onChange={(e) => setFormats((f) => ({ ...f, docx: e.target.checked }))}
                />
                docx
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="citation" className="text-sm text-muted-foreground">
              Citation style
            </label>
            <select
              id="citation"
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value as "APA" | "MLA")}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="APA">APA</option>
              <option value="MLA">MLA</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="include-local" className="text-sm text-muted-foreground">
              Include local docs
            </label>
            <div className="flex h-10 items-center gap-2">
              <input
                id="include-local"
                type="checkbox"
                checked={includeLocal}
                onChange={(e) => setIncludeLocal(e.target.checked)}
              />
              <span className="text-sm">Enable RAG from my-docs</span>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">Ingest local docs</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onIngest}
                disabled={ingestLoading}
                className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm hover:bg-accent disabled:opacity-50"
              >
                {ingestLoading ? "Re-ingesting..." : "Re-ingest now"}
              </button>
              <button
                type="button"
                onClick={fetchIndexStats}
                className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm hover:bg-accent"
              >
                Refresh status
              </button>
            </div>
            {ingestStatus && (
              <div className="text-xs text-muted-foreground">{ingestStatus}</div>
            )}
            {indexStats && (
              <div className="text-xs text-muted-foreground">
                Last indexed: {indexStats.updatedAt ? new Date(indexStats.updatedAt).toLocaleString() : "never"} • {indexStats.items} chunks
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !task}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button
            type="button"
            onClick={startStreaming}
            disabled={sseActive || !task}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            {sseActive ? "Streaming..." : "Stream Live"}
          </button>
        </div>
      </form>

      <div className="mb-8 grid gap-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stream progress (SSE)</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="grid gap-2 md:col-span-3">
            <label htmlFor="api-key" className="text-sm text-muted-foreground">
              API key (optional, required if API_KEYS is set on server)
            </label>
            <input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key if required"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={startStreaming}
              disabled={!task || sseActive}
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-accent disabled:opacity-50"
            >
              {sseActive ? "Streaming..." : "Start streaming"}
            </button>
          </div>
        </div>

        {!!sseLogs.length && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            {sseLogs.map((l, i) => (
              <div key={i} className="mb-1 whitespace-pre-wrap">{l}</div>
            ))}
          </div>
        )}

        {ssePreview && (
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-base font-semibold">Live preview</h3>
            <pre className="whitespace-pre-wrap text-sm">{ssePreview}</pre>
          </div>
        )}
      </div>

      {reportId && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Report ID: {reportId}</div>
          <Link
            href={`/api/reports/${encodeURIComponent(reportId)}`}
            className="text-sm text-primary underline"
          >
            Download
          </Link>
        </div>
      )}

      {reportText && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-semibold">Preview</h2>
          <pre className="whitespace-pre-wrap text-sm">{reportText}</pre>
        </div>
      )}
    </div>
  );
}
