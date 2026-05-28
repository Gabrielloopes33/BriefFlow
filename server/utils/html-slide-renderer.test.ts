import { describe, expect, it } from 'vitest';
import { configToHtml } from './html-slide-renderer';
import type { HtmlSlideConfig, HtmlTextPosition } from '@shared/types/html-slide-config';

function baseConfig(): HtmlSlideConfig {
  return {
    id: 'slide-1',
    index: 0,
    theme: 'dark',
    backgroundColor: '#101828',
    overlayColor: '#000000',
    overlayOpacity: 45,
    textPosition: 'mid-left',
    title: {
      text: 'Titulo de teste',
      color: '#ffffff',
      fontSize: 64,
      fontFamily: 'Space Grotesk',
      fontWeight: 'bold',
      align: 'left',
    },
    subtitle: {
      text: 'Subtitulo de teste',
      color: '#e5e7eb',
      fontSize: 30,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      align: 'left',
    },
    ctaButton: {
      visible: true,
      text: 'Saiba mais',
      backgroundColor: '#f97316',
      textColor: '#ffffff',
      borderRadius: 18,
    },
    accentColor: '#f97316',
  };
}

describe('configToHtml', () => {
  it('renders background image and overlay', () => {
    const html = configToHtml({
      ...baseConfig(),
      backgroundImageUrl: 'https://cdn.example.com/img.png',
      backgroundZoom: 120,
      backgroundPositionX: 25,
      backgroundPositionY: 70,
    });

    expect(html).toContain('background-image:url');
    expect(html).toContain('opacity:0.45');
    expect(html).toContain('background-position:25% 70%');
  });

  it('maps all 9 text positions to flex align styles', () => {
    const positions: HtmlTextPosition[] = [
      'top-left',
      'top-center',
      'top-right',
      'mid-left',
      'mid',
      'mid-right',
      'bot-left',
      'bot-center',
      'bot-right',
    ];

    for (const position of positions) {
      const html = configToHtml({ ...baseConfig(), textPosition: position });
      expect(html).toContain('justify-content:');
      expect(html).toContain('align-items:');
    }
  });

  it('renders CTA only when visible', () => {
    const withCta = configToHtml(baseConfig());
    const withoutCta = configToHtml({
      ...baseConfig(),
      ctaButton: {
        ...baseConfig().ctaButton,
        visible: false,
      },
    });

    expect(withCta).toContain('<button');
    expect(withoutCta).not.toContain('<button');
  });

  it('supports dark and light theme values in content', () => {
    const darkHtml = configToHtml({ ...baseConfig(), theme: 'dark' });
    const lightHtml = configToHtml({ ...baseConfig(), theme: 'light', backgroundColor: '#f8fafc' });

    expect(darkHtml).toContain('background:#101828');
    expect(lightHtml).toContain('background:#f8fafc');
  });

  it('renders distinct markup for each template variant', () => {
    const spotlightHtml = configToHtml({ ...baseConfig(), templateVariant: 'spotlight' });
    const glassHtml = configToHtml({ ...baseConfig(), templateVariant: 'glass-card' });
    const editorialHtml = configToHtml({ ...baseConfig(), templateVariant: 'editorial-band' });
    const minimalHtml = configToHtml({ ...baseConfig(), templateVariant: 'minimal' });

    expect(spotlightHtml).toContain('border-radius:36px');
    expect(glassHtml).toContain('backdrop-filter:blur(14px)');
    expect(editorialHtml).toContain('Editorial');
    expect(minimalHtml).toContain('Insight');
    expect(glassHtml).toContain('text-transform:uppercase');
    expect(editorialHtml).toContain('grid-template-columns:minmax(0,1.3fr) minmax(220px,0.9fr)');
    expect(minimalHtml).toContain('border-top:1px solid');
  });
});
