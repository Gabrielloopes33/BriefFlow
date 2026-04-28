/**
 * FontLoader — Pré-carrega fontes web para o canvas Konva
 * Usa FontFace API para garantir que as fontes estejam carregadas antes da renderização
 */

import { useEffect, useState } from 'react';

export const FONT_FAMILIES = [
  { name: 'Inter', weights: [400, 700] },
  { name: 'Space Grotesk', weights: [400, 700] },
  { name: 'Syne', weights: [400, 700] },
  { name: 'Outfit', weights: [400, 700] },
  { name: 'DM Sans', weights: [400, 700] },
  { name: 'Raleway', weights: [400, 700] },
  { name: 'Oswald', weights: [400, 700] },
  { name: 'Playfair Display', weights: [400, 700] },
  { name: 'Caveat', weights: [400, 700] },
] as const;

export type FontFamilyName = typeof FONT_FAMILIES[number]['name'];

// Mapeamento de nomes curtos (usados no código) para nomes completos (CSS)
export const FONT_NAME_MAP: Record<string, FontFamilyName> = {
  'Inter': 'Inter',
  'Space': 'Space Grotesk',
  'Syne': 'Syne',
  'Outfit': 'Outfit',
  'DM Sans': 'DM Sans',
  'Raleway': 'Raleway',
  'Oswald': 'Oswald',
  'Playfair': 'Playfair Display',
  'Caveat': 'Caveat',
};

function buildGoogleFontsUrl(): string {
  const families = FONT_FAMILIES.map(
    (f) => `family=${encodeURIComponent(f.name)}:wght@${f.weights.join(';')}`
  );
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

interface FontLoaderProps {
  onFontsLoaded?: () => void;
  children: React.ReactNode;
}

export function FontLoader({ onFontsLoaded, children }: FontLoaderProps) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFonts() {
      // 1. Injeta o link do Google Fonts
      const linkId = 'google-fonts-preload';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = buildGoogleFontsUrl();
        document.head.appendChild(link);
      }

      // 2. Aguarda o carregamento das fontes via FontFace API
      try {
        const loadPromises = FONT_FAMILIES.flatMap((family) =>
          family.weights.map((weight) =>
            document.fonts.load(`${weight} 16px "${family.name}"`).catch(() => null)
          )
        );

        await Promise.all(loadPromises);
        await document.fonts.ready;
      } catch (err) {
        console.warn('[FontLoader] Erro ao carregar fontes, usando fallback:', err);
      }

      if (!cancelled) {
        setFontsReady(true);
        onFontsLoaded?.();
      }
    }

    loadFonts();

    return () => {
      cancelled = true;
    };
  }, [onFontsLoaded]);

  if (!fontsReady) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Carregando fontes...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
