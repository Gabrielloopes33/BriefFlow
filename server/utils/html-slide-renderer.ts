import type { HtmlSlideConfig, HtmlTextPosition } from '@shared/types/html-slide-config';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function positionToStyles(textPosition: HtmlTextPosition): { justify: string; align: string } {
  const map: Record<HtmlTextPosition, { justify: string; align: string }> = {
    'top-left': { justify: 'flex-start', align: 'flex-start' },
    'top-center': { justify: 'flex-start', align: 'center' },
    'top-right': { justify: 'flex-start', align: 'flex-end' },
    'mid-left': { justify: 'center', align: 'flex-start' },
    mid: { justify: 'center', align: 'center' },
    'mid-right': { justify: 'center', align: 'flex-end' },
    'bot-left': { justify: 'flex-end', align: 'flex-start' },
    'bot-center': { justify: 'flex-end', align: 'center' },
    'bot-right': { justify: 'flex-end', align: 'flex-end' },
  };

  return map[textPosition];
}

export function configToHtml(config: HtmlSlideConfig): string {
  const canvasWidth = clamp(config.canvasWidth ?? 1080, 320, 2000);
  const canvasHeight = clamp(config.canvasHeight ?? 1080, 320, 2400);
  const overlayOpacity = clamp(config.overlayOpacity, 0, 100) / 100;
  const bgZoom = clamp(config.backgroundZoom ?? 100, 50, 300);
  const bgPosX = clamp(config.backgroundPositionX ?? 50, 0, 100);
  const bgPosY = clamp(config.backgroundPositionY ?? 50, 0, 100);
  const ctaRadius = clamp(config.ctaButton.borderRadius, 0, 48);
  const { justify, align } = positionToStyles(config.textPosition);
  const templateVariant = config.templateVariant || 'spotlight';

  const bgStyle = config.backgroundImageUrl
    ? `background-image:url('${escapeHtml(config.backgroundImageUrl)}');background-size:${bgZoom}%;background-position:${bgPosX}% ${bgPosY}%;background-repeat:no-repeat;`
    : config.backgroundGradient
      ? `background:${escapeHtml(config.backgroundGradient)};`
      : `background:${escapeHtml(config.backgroundColor)};`;

  const titleSize = clamp(config.title.fontSize, 24, 120);
  const subtitleSize = clamp(config.subtitle.fontSize, 14, 64);
  const titleText = escapeHtml(config.title.text);
  const subtitleText = escapeHtml(config.subtitle.text);
  const ctaText = escapeHtml(config.ctaButton.text);
  const contentMaxWidth = Math.round(canvasWidth * (templateVariant === 'minimal' ? 0.56 : templateVariant === 'glass-card' ? 0.62 : 0.78));
  const accentColor = escapeHtml(config.accentColor);
  const edgeTone = config.theme === 'light' ? 'rgba(10,10,10,0.08)' : 'rgba(255,255,255,0.14)';

  let variantWrapperStyle = 'display:flex;flex-direction:column;gap:22px;';
  let accentHtml = `<div style="width:84px;height:8px;border-radius:999px;background:${accentColor};"></div>`;
  let variantDecorationHtml = '';
  let titleLineHeight = 1.15;
  let subtitleLineHeight = 1.5;
  let ctaTopMargin = 12;

  if (templateVariant === 'spotlight') {
    variantWrapperStyle += 'padding:40px 36px 34px;border-radius:32px;background:linear-gradient(180deg, rgba(12,12,12,0.16) 0%, rgba(12,12,12,0.62) 100%);box-shadow:0 26px 80px rgba(0,0,0,0.28);backdrop-filter:blur(2px);';
    variantDecorationHtml = `<div style="position:absolute;inset:24px;z-index:0;border:1px solid ${edgeTone};border-radius:36px;"></div>`;
  } else if (templateVariant === 'glass-card') {
    variantWrapperStyle += `padding:34px;border-radius:28px;background:rgba(255,255,255,0.12);border:1px solid ${edgeTone};box-shadow:0 24px 70px rgba(0,0,0,0.18);backdrop-filter:blur(14px);`;
    variantDecorationHtml = `<div style="position:absolute;top:42px;right:42px;width:180px;height:180px;border-radius:50%;background:${accentColor};opacity:0.16;filter:blur(18px);"></div>`;
  } else if (templateVariant === 'editorial-band') {
    variantWrapperStyle += `width:100%;padding:38px 44px;border-radius:0;background:${config.theme === 'light' ? 'rgba(247,247,245,0.86)' : 'rgba(10,10,10,0.76)'};border-top:1px solid ${edgeTone};border-bottom:1px solid ${edgeTone};box-shadow:0 16px 48px rgba(0,0,0,0.14);`;
    accentHtml = `<div style="display:inline-flex;align-items:center;gap:12px;"><div style="width:112px;height:10px;border-radius:999px;background:${accentColor};"></div><div style="font-family:'Inter',sans-serif;font-size:16px;letter-spacing:0.18em;text-transform:uppercase;color:${accentColor};">Editorial</div></div>`;
    titleLineHeight = 1.02;
  } else if (templateVariant === 'minimal') {
    variantWrapperStyle += 'padding:0;';
    accentHtml = `<div style="display:inline-flex;align-items:center;padding:8px 14px;border-radius:999px;border:1px solid ${accentColor};font-family:'Inter',sans-serif;font-size:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};background:rgba(255,255,255,0.06);">Insight</div>`;
    titleLineHeight = 1.04;
    subtitleLineHeight = 1.42;
    ctaTopMargin = 6;
  }

  const titleHtml = `<h1 style="margin:0;font-family:'${config.title.fontFamily}',sans-serif;font-size:${titleSize}px;line-height:${titleLineHeight};font-weight:${config.title.fontWeight};color:${escapeHtml(config.title.color)};">${titleText}</h1>`;
  const subtitleHtml = `<p style="margin:0;font-family:'${config.subtitle.fontFamily}',sans-serif;font-size:${subtitleSize}px;line-height:${subtitleLineHeight};font-weight:${config.subtitle.fontWeight};color:${escapeHtml(config.subtitle.color)};">${subtitleText}</p>`;
  const ctaHtml = config.ctaButton.visible ? `<div style="margin-top:${ctaTopMargin}px;"><button style="display:inline-flex;padding:14px 26px;border:none;border-radius:${ctaRadius}px;background:${escapeHtml(config.ctaButton.backgroundColor)};color:${escapeHtml(config.ctaButton.textColor)};font-family:'Inter',sans-serif;font-size:24px;font-weight:700;line-height:1;">${ctaText}</button></div>` : '';

  let contentHtml = `${accentHtml}${titleHtml}${subtitleHtml}${ctaHtml}`;

  if (templateVariant === 'glass-card') {
    contentHtml = `<div style="display:flex;flex-direction:column;gap:18px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;">${accentHtml}<div style="max-width:72%;font-family:'Inter',sans-serif;font-size:18px;line-height:1.45;font-weight:600;color:${escapeHtml(config.subtitle.color)};text-transform:uppercase;letter-spacing:0.08em;">${subtitleText}</div></div>${titleHtml}${ctaHtml}</div>`;
  } else if (templateVariant === 'editorial-band') {
    contentHtml = `<div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(220px,0.9fr);gap:28px;align-items:end;"><div style="display:flex;flex-direction:column;gap:18px;">${accentHtml}${titleHtml}</div><div style="display:flex;flex-direction:column;gap:16px;justify-self:stretch;align-self:stretch;padding-left:8px;border-left:1px solid ${edgeTone};">${subtitleHtml}${ctaHtml}</div></div>`;
  } else if (templateVariant === 'minimal') {
    contentHtml = `<div style="display:flex;flex-direction:column;gap:28px;">${accentHtml}${titleHtml}<div style="display:flex;flex-direction:column;gap:16px;max-width:${Math.round(contentMaxWidth * 0.84)}px;padding:18px 0 0;border-top:1px solid ${edgeTone};">${subtitleHtml}${ctaHtml}</div></div>`;
  }

  return `<div style="width:${canvasWidth}px;height:${canvasHeight}px;position:relative;overflow:hidden;display:flex;justify-content:${justify};align-items:${align};padding:80px;box-sizing:border-box;background:${escapeHtml(config.backgroundColor)};">
  <div style="position:absolute;inset:0;${bgStyle}"></div>
  <div style="position:absolute;inset:0;background:${escapeHtml(config.overlayColor)};opacity:${overlayOpacity};"></div>
  ${variantDecorationHtml}
  <div style="position:relative;z-index:1;max-width:${contentMaxWidth}px;display:flex;flex-direction:column;gap:22px;text-align:${config.title.align};${variantWrapperStyle}">
    ${contentHtml}
  </div>
</div>`;
}
