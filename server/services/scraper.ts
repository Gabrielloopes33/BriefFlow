/**
 * Serviço de integração com o Scraper Python
 * Comunicação HTTP entre Node.js backend e Python FastAPI scraper
 */

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || process.env.SCRAPER_URL || "http://localhost:8000";

export interface ScrapingRequest {
  source_ids?: string[];
  client_ids?: string[];
  force_rescrape?: boolean;
}

export interface ScrapingResponse {
  task_id: string;
  status: string;
  estimated_duration: number;
}

export interface TaskStatusResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  items_scraped: number;
  started_at?: string;
  estimated_completion?: string;
  error_message?: string;
}

export interface ScrapedContent {
  title: string;
  url: string;
  content_text?: string;
  summary?: string;
  author?: string;
  published_at?: string;
  tags?: string[];
  source_type: "rss" | "blog" | "news" | "youtube";
  word_count: number;
  reading_time: number;
}

export interface SourceTestResult {
  success: boolean;
  message: string;
  sample_content?: ScrapedContent;
  feed_info?: {
    title: string;
    description: string;
    language: string;
    entries_count: number;
  };
}

/**
 * Verifica se o serviço de scraper está disponível
 */
export async function checkScraperHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SCRAPER_API_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch (error) {
    console.error("❌ Scraper service unavailable:", error);
    return false;
  }
}

/**
 * Inicia uma tarefa de scraping
 */
export async function startScraping(
  request: ScrapingRequest
): Promise<ScrapingResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start scraping: ${error}`);
  }

  return response.json();
}

/**
 * Obtém o status de uma tarefa de scraping
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/tasks/${taskId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get task status: ${error}`);
  }

  return response.json();
}

/**
 * Obtém todas as tarefas de scraping
 */
export async function getAllTasks(): Promise<TaskStatusResponse[]> {
  const response = await fetch(`${SCRAPER_API_URL}/tasks`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get tasks: ${error}`);
  }

  return response.json();
}

/**
 * Faz scraping de uma URL específica
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const response = await fetch(`${SCRAPER_API_URL}/scrape-url?url=${encodeURIComponent(url)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to scrape URL: ${error}`);
  }

  return response.json();
}

/**
 * Testa uma fonte antes de adicioná-la
 */
export async function testSource(
  url: string,
  sourceType: "rss" | "blog" | "news" | "youtube"
): Promise<SourceTestResult> {
  const response = await fetch(
    `${SCRAPER_API_URL}/test-source?url=${encodeURIComponent(url)}&source_type=${sourceType}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to test source: ${error}`);
  }

  return response.json();
}

/**
 * Obtém conteúdos de um cliente do scraper
 */
export async function getClientContentsFromScraper(
  clientId: string,
  limit: number = 100
): Promise<{ contents: any[]; count: number }> {
  const response = await fetch(
    `${SCRAPER_API_URL}/clients/${clientId}/contents?limit=${limit}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get contents: ${error}`);
  }

  return response.json();
}
