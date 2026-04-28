import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientSelector } from "@/components/studio/ClientSelector";
import { ConversationalInput } from "@/components/studio/ConversationalInput";
import { QuickActionChips } from "@/components/studio/QuickActionChips";
import { GenerationProgress } from "@/components/studio/GenerationProgress";
import { GenerationResult } from "@/components/studio/GenerationResult";
import { useClients } from "@/hooks/use-clients";
import { useJobWebSocket } from "@/hooks/use-job-websocket";
import { apiGet, apiPost } from "@/lib/api";

interface JobCreateResponse {
  job_id: string;
}

interface JobStatusResponse {
  status: string;
  stage?: string;
  progress?: number;
  error?: unknown;
  result?: {
    post_id?: string;
  } | null;
}

interface StudioPost {
  id: string;
  title?: string;
  content?: string;
  created_at?: string;
}

interface StudioCreative {
  id: string;
  postId?: string | null;
}

const CLIENT_STORAGE_KEY = "bf_studio_client_id";
const DEFAULT_WS_TOKEN = "00000000-0000-0000-0000-000000000001";

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StudioPage() {
  const { data: clients = [] } = useClients();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [stage, setStage] = useState<string>("validating_input");
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultPost, setResultPost] = useState<StudioPost | null>(null);
  const [resultCreativeId, setResultCreativeId] = useState<string | undefined>(undefined);
  const [recentPosts, setRecentPosts] = useState<StudioPost[]>([]);

  const { connected, usingFallback, lastEvent, connect } = useJobWebSocket(activeJobId || undefined);

  const wsToken = useMemo(() => {
    const envToken = (import.meta as any)?.env?.VITE_WS_TOKEN as string | undefined;
    const envUser = (import.meta as any)?.env?.VITE_DEV_USER_ID as string | undefined;
    const localToken = typeof window !== "undefined" ? localStorage.getItem("bf_ws_token") || undefined : undefined;
    return envToken || localToken || envUser || DEFAULT_WS_TOKEN;
  }, []);

  useEffect(() => {
    const storedClient = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (storedClient) {
      setSelectedClient(storedClient);
    }
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    localStorage.setItem(CLIENT_STORAGE_KEY, selectedClient);
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient) {
      setRecentPosts([]);
      return;
    }

    let mounted = true;
    apiGet<StudioPost[]>(`/api/clients/${selectedClient}/posts/list`)
      .then((posts) => {
        if (!mounted) return;
        setRecentPosts((posts || []).slice(0, 5));
      })
      .catch(() => {
        if (!mounted) return;
        setRecentPosts([]);
      });

    return () => {
      mounted = false;
    };
  }, [selectedClient, resultPost?.id]);

  useEffect(() => {
    if (!activeJobId) return;

    connect(wsToken);
  }, [activeJobId, connect, wsToken]);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "job:stage") {
      setStage(lastEvent.stage || stage);
      setProgress(lastEvent.progress ?? progress);
    }

    if (lastEvent.type === "agent:start" && lastEvent.agentName) {
      setStage(`agent:${lastEvent.agentName}`);
    }

    if (lastEvent.type === "job:failed") {
      setJobStatus("failed");
      setErrorMessage(lastEvent.error || "Falha ao gerar conteúdo.");
    }

    if (lastEvent.type === "job:complete" && lastEvent.postId) {
      setJobStatus("completed");
      setProgress(100);
      void finalizeJob(lastEvent.postId);
    }
  }, [lastEvent]);

  useEffect(() => {
    if (!activeJobId) return;
    if (jobStatus === "completed" || jobStatus === "failed") return;

    const timer = setInterval(async () => {
      try {
        const job = await apiGet<JobStatusResponse>(`/api/jobs/${activeJobId}`);
        setJobStatus(job.status || "processing");
        if (job.stage) setStage(job.stage);
        if (typeof job.progress === "number") setProgress(job.progress);

        if (job.status === "completed" && job.result?.post_id) {
          clearInterval(timer);
          setProgress(100);
          await finalizeJob(job.result.post_id);
        }

        if (job.status === "failed") {
          clearInterval(timer);
          setErrorMessage(typeof job.error === "string" ? job.error : "Falha ao gerar conteúdo.");
        }
      } catch {
        // Polling segue tentando; websocket pode estar ativo.
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeJobId, jobStatus, selectedClient]);

  async function finalizeJob(postId: string) {
    const post = await apiGet<StudioPost>(`/api/posts/${postId}`);
    setResultPost(post);

    if (selectedClient) {
      try {
        const creatives = await apiGet<StudioCreative[]>(`/api/creatives?client_id=${selectedClient}`);
        const match = creatives.find((creative) => creative.postId === postId);
        setResultCreativeId(match?.id);
      } catch {
        setResultCreativeId(undefined);
      }
    }
  }

  async function handleGenerate() {
    if (!selectedClient || !prompt.trim()) return;

    setErrorMessage(null);
    setResultPost(null);
    setResultCreativeId(undefined);
    setProgress(5);
    setStage("validating_input");
    setJobStatus("processing");

    try {
      const payload = {
        goal: prompt,
        language: "pt-BR",
        channels: ["instagram"],
        tone: "consultivo",
        title_hint: prompt.slice(0, 80),
        idempotency_key: generateIdempotencyKey(),
      };
      const response = await apiPost<JobCreateResponse>(`/api/clients/${selectedClient}/posts`, payload);
      setActiveJobId(response.job_id);
    } catch (error: any) {
      setJobStatus("failed");
      setErrorMessage(error?.message || "Não foi possível iniciar a geração.");
    }
  }

  const isGenerating = jobStatus === "processing" || jobStatus === "queued";
  const creativeHubHref = selectedClient
    ? `/creatives/new?client_id=${encodeURIComponent(selectedClient)}`
    : "/creatives/new";

  const resultCreativeHref = resultPost
    ? `/creatives/new?client_id=${encodeURIComponent(selectedClient)}&post_id=${encodeURIComponent(resultPost.id)}`
    : undefined;

  return (
    <AppShell>
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="space-y-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">Studio</Badge>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Crie conteúdo em poucos minutos</h1>
                <p className="text-muted-foreground">Descreva o conteúdo desejado e o BriefFlow cuida da geração completa.</p>
              </div>
              <a href={creativeHubHref}>
                <Button variant="outline">Ir para Creative</Button>
              </a>
            </div>
          </div>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Nova geração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClientSelector
                clients={clients.map((client) => ({ id: client.id, name: client.name }))}
                value={selectedClient}
                onChange={setSelectedClient}
              />

              <QuickActionChips onSelect={setPrompt} />

              <ConversationalInput
                value={prompt}
                loading={isGenerating}
                disabled={!selectedClient}
                onChange={setPrompt}
                onSubmit={handleGenerate}
              />

              <GenerationProgress active={isGenerating} stage={stage} progress={progress} />

              {usingFallback ? (
                <Alert>
                  <AlertDescription>Conexão em tempo real indisponível no momento. Continuando atualização automática.</AlertDescription>
                </Alert>
              ) : null}

              {connected && isGenerating ? (
                <p className="text-xs text-muted-foreground">Conectado em tempo real.</p>
              ) : null}
            </CardContent>
          </Card>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <GenerationResult post={resultPost} creativeId={resultCreativeId} creativeEntryHref={resultCreativeHref} />

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Últimas gerações</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há gerações recentes para este cliente.</p>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="rounded-md border border-border/50 p-3">
                      <p className="font-medium text-sm">{post.title || "Sem título"}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{post.content || "Sem conteúdo"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
