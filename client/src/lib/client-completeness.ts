export interface ClientProfile {
  name?: string;
  niche?: string;
  description?: string;
  tone_of_voice?: string;
  content_pillars?: string[];
  target_audience?: string;
  forbidden_words?: string[];
  sources?: unknown[];
  example_posts?: unknown[];
}

const weights: Record<string, number> = {
  name: 20,
  niche: 10,
  description: 10,
  tone_of_voice: 10,
  content_pillars: 15,
  target_audience: 10,
  sources: 15,
  example_posts: 10,
};

export function calculateClientCompleteness(client: ClientProfile): number {
  let total = 0;
  if (client.name?.trim()) total += weights.name;
  if (client.niche?.trim()) total += weights.niche;
  if (client.description?.trim()) total += weights.description;
  if (client.tone_of_voice?.trim()) total += weights.tone_of_voice;
  if ((client.content_pillars ?? []).length > 0) total += weights.content_pillars;
  if (client.target_audience?.trim()) total += weights.target_audience;
  if ((client.sources ?? []).length > 0) total += weights.sources;
  if ((client.example_posts ?? []).length > 0) total += weights.example_posts;
  return Math.min(100, total);
}

export function completenessColor(pct: number): string {
  if (pct >= 80) return "text-green-400";
  if (pct >= 50) return "text-yellow-400";
  return "text-red-400";
}
