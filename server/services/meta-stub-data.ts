/**
 * Meta Stub Data — Dados mockados de analytics para desenvolvimento
 * Usado quando META_APP_ID não está configurado (ambiente de dev)
 */

export interface StubAnalyticsEntry {
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
  followers: number;
  followersGrowth: number;
  posts: Array<{
    id: string;
    message: string;
    created_time: string;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    type: string;
  }>;
  topFormats: string[];
  topTopics: string[];
  bestPostingHours: string[];
  avgEngagementRate: number;
}

export function generateStubAnalytics(clientName: string): StubAnalyticsEntry {
  const formats = ['carrossel', 'reels', 'imagem', 'texto', 'story'];
  const topics = ['produtividade', 'marketing digital', 'empreendedorismo', 'dicas', 'tendências'];
  const hours = ['09:00', '12:00', '18:00', '20:00', '21:00'];

  // Determinístico baseado no nome do cliente para consistência
  const seed = clientName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = <T>(arr: T[], idx: number): T => arr[(seed + idx) % arr.length];

  return {
    reach: 15000 + (seed % 50000),
    impressions: 45000 + (seed % 150000),
    engagement: 1200 + (seed % 8000),
    engagementRate: 0.03 + (seed % 100) / 1000,
    followers: 5000 + (seed % 50000),
    followersGrowth: 2 + (seed % 15),
    posts: Array.from({ length: 5 }, (_, i) => ({
      id: `post_${i + 1}`,
      message: `Post de exemplo ${i + 1} sobre ${pick(topics, i)}`,
      created_time: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      likes: 50 + ((seed + i * 100) % 500),
      comments: 5 + ((seed + i * 50) % 100),
      shares: 2 + ((seed + i * 30) % 50),
      reach: 1000 + ((seed + i * 200) % 8000),
      type: pick(formats, i),
    })),
    topFormats: [pick(formats, 0), pick(formats, 1), pick(formats, 2)],
    topTopics: [pick(topics, 0), pick(topics, 1), pick(topics, 2)],
    bestPostingHours: [pick(hours, 0), pick(hours, 1)],
    avgEngagementRate: 0.03 + (seed % 100) / 1000,
  };
}
