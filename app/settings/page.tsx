"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PROVIDERS, MODEL_OPTIONS, type ProviderId, defaultModelFor, type ModelInfo } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Zap, FileText, Database, Key } from "lucide-react";

export default function SettingsPage() {
  // Provider & Model State
  const [provider, setProvider] = useState<ProviderId>("google");
  const [model, setModel] = useState<string>(defaultModelFor("google"));
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[] | null>(null);
  
  // Research State
  const [task, setTask] = useState("");
  const [maxResults, setMaxResults] = useState<number>(5);
  const [wordCount, setWordCount] = useState<number>(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  
  // Format & Citation State
  const [formats, setFormats] = useState<{ md: boolean; pdf: boolean; docx: boolean }>({ md: true, pdf: false, docx: false });
  const [citationStyle, setCitationStyle] = useState<"APA" | "MLA">("APA");
  const [includeLocal, setIncludeLocal] = useState<boolean>(true);
  
  // Local Docs State
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState<boolean>(false);
  const [indexStats, setIndexStats] = useState<{ items: number; updatedAt?: string } | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  
  // Streaming State
  const [sseActive, setSseActive] = useState(false);
  const [sseLogs, setSseLogs] = useState<string[]>([]);
  const [ssePreview, setSsePreview] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setModel(defaultModelFor(provider));
  }, [provider]);

  const models = useMemo(() => MODEL_OPTIONS[provider], [provider]);

  // Discover enabled providers from server
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
    } catch (err: any) {
      setError(err?.message || String(err));
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
    } catch (e: any) {
      setIngestStatus(`Ingest failed: ${e?.message || String(e)}`);
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

  if (enabledProviders === null) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to Chat
        </Link>
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure your AI providers and model preferences for chat and research.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {enabledProviders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-lg font-semibold mb-2">No Providers Configured</div>
                  <div className="text-sm text-muted-foreground">Configure API keys in .env to enable providers</div>
                </div>
              ) : (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Select value={provider} onValueChange={(value) => setProvider(value as ProviderId)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {enabledProviders
                            .map((pid) => PROVIDERS.find((p) => p.id === pid))
                            .filter(Boolean)
                            .map((p) => (
                              <SelectItem key={(p as any).id} value={(p as any).id}>
                                {(p as any).label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m: ModelInfo) => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex items-center gap-2">
                                <span>{m.label}</span>
                                {m.tags?.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-results">Max Search Results</Label>
                      <Input
                        id="max-results"
                        type="number"
                        min={1}
                        max={20}
                        value={maxResults}
                        onChange={(e) => setMaxResults(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="word-count">Target Word Count</Label>
                      <Input
                        id="word-count"
                        type="number"
                        min={300}
                        step={100}
                        value={wordCount}
                        onChange={(e) => setWordCount(Math.max(300, Number(e.target.value) || 300))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Generation</CardTitle>
              <CardDescription>
                Generate comprehensive, citation-rich research reports using web findings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="task">Research Topic or Question</Label>
                  <Input
                    id="task"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="e.g., State of AI in 2025"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Citation Style</Label>
                    <Select value={citationStyle} onValueChange={(value) => setCitationStyle(value as "APA" | "MLA")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APA">APA</SelectItem>
                        <SelectItem value="MLA">MLA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="include-local"
                      checked={includeLocal}
                      onCheckedChange={(checked) => setIncludeLocal(!!checked)}
                    />
                    <Label htmlFor="include-local">Include local documents (RAG)</Label>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={loading || !task}>
                    {loading ? "Generating..." : "Generate Report"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startStreaming}
                    disabled={sseActive || !task}
                  >
                    {sseActive ? "Streaming..." : "Stream Live"}
                  </Button>
                </div>
              </form>

              {reportId && (
                <div className="mt-6 flex items-center justify-between p-4 bg-muted rounded-lg">
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
                <div className="mt-6 rounded-lg border p-4">
                  <h3 className="mb-2 text-lg font-semibold">Preview</h3>
                  <pre className="whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">{reportText}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streaming Section */}
          <Card>
            <CardHeader>
              <CardTitle>Live Streaming</CardTitle>
              <CardDescription>
                Watch the research process in real-time with server-sent events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key (optional)</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key if required by server"
                  type="password"
                />
              </div>

              {!!sseLogs.length && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs max-h-64 overflow-y-auto">
                  {sseLogs.map((l, i) => (
                    <div key={i} className="mb-1 whitespace-pre-wrap">{l}</div>
                  ))}
                </div>
              )}

              {ssePreview && (
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 text-base font-semibold">Live Preview</h4>
                  <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">{ssePreview}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Local Document Management</CardTitle>
              <CardDescription>
                Manage your local document index for RAG (Retrieval-Augmented Generation).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <Button
                  onClick={onIngest}
                  disabled={ingestLoading}
                  variant="outline"
                >
                  {ingestLoading ? "Re-ingesting..." : "Re-ingest Documents"}
                </Button>
                <Button
                  onClick={fetchIndexStats}
                  variant="outline"
                >
                  Refresh Status
                </Button>
              </div>

              {ingestStatus && (
                <div className="text-sm p-3 bg-muted rounded-md">{ingestStatus}</div>
              )}

              {indexStats && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  <div>Last indexed: {indexStats.updatedAt ? new Date(indexStats.updatedAt).toLocaleString() : "never"}</div>
                  <div>Total chunks: {indexStats.items}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Preferences</CardTitle>
              <CardDescription>
                Configure default export formats for your research reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Default Export Formats</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="format-md"
                      checked={formats.md}
                      onCheckedChange={(checked) => setFormats((f) => ({ ...f, md: !!checked }))}
                    />
                    <Label htmlFor="format-md">Markdown (.md)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="format-pdf"
                      checked={formats.pdf}
                      onCheckedChange={(checked) => setFormats((f) => ({ ...f, pdf: !!checked }))}
                    />
                    <Label htmlFor="format-pdf">PDF (.pdf)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="format-docx"
                      checked={formats.docx}
                      onCheckedChange={(checked) => setFormats((f) => ({ ...f, docx: !!checked }))}
                    />
                    <Label htmlFor="format-docx">Word Document (.docx)</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
