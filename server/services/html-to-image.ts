/**
 * Serviço de conversão HTML/CSS → PNG via Satori + Sharp
 * Usado para exportar slides gerados pelo html-slide-generator sem Chromium
 */

import satori from 'satori';
import { html as satoriHtml } from 'satori-html';
import sharp from 'sharp';
import { sanitizeSlideHtml } from '../utils/html-sanitizer.js';

export interface HtmlToImageOptions {
  width?: number;
  height?: number;
  scale?: number;
}

interface FontEntry {
  name: string;
  data: ArrayBuffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: 'normal' | 'italic';
}

let fontsCache: FontEntry[] | null = null;

async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssResp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BriefFlow/1.0)' },
  });
  const css = await cssResp.text();
  const fontUrlMatch = css.match(/src: url\(([^)]+)\)/);
  if (!fontUrlMatch) throw new Error(`Font URL not found for ${family}:${weight}`);
  const fontResp = await fetch(fontUrlMatch[1]);
  return fontResp.arrayBuffer();
}

async function loadFonts(): Promise<FontEntry[]> {
  if (fontsCache) return fontsCache;

  const fonts: FontEntry[] = [];

  const fontConfigs = [
    { name: 'Inter', weight: 400 as const },
    { name: 'Inter', weight: 700 as const },
    { name: 'Space Grotesk', weight: 400 as const },
    { name: 'Space Grotesk', weight: 700 as const },
    { name: 'Merriweather', weight: 400 as const },
    { name: 'Merriweather', weight: 700 as const },
  ];

  await Promise.all(
    fontConfigs.map(async ({ name, weight }) => {
      try {
        const data = await fetchGoogleFont(name, weight);
        fonts.push({ name, data, weight, style: 'normal' });
      } catch (err) {
        console.warn(`[html-to-image] Failed to load font ${name}:${weight}:`, err);
      }
    })
  );

  fontsCache = fonts;
  return fonts;
}

/**
 * Converte uma string HTML/CSS em buffer PNG usando Satori + Sharp.
 * HTML deve ter dimensões fixas 1080×1080px e usar apenas inline styles.
 */
export async function htmlToImageBuffer(
  html: string,
  options: HtmlToImageOptions = {}
): Promise<Buffer> {
  const { width = 1080, height = 1080, scale = 2 } = options;

  const safeHtml = sanitizeSlideHtml(html);
  if (!safeHtml.trim()) {
    throw new Error('[html-to-image] HTML vazio após sanitização');
  }

  const fonts = await loadFonts();

  // satori-html converte HTML string em VDOM compatível com Satori
  const wrappedHtml = `<div style="width:${width}px;height:${height}px;overflow:hidden;position:relative;display:flex">${safeHtml}</div>`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = satoriHtml(wrappedHtml) as any;

  const svg = await satori(element, {
    width,
    height,
    fonts,
    embedFont: true,
  });

  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(width * scale, height * scale)
    .png({ quality: 95 })
    .toBuffer();

  return pngBuffer;
}

