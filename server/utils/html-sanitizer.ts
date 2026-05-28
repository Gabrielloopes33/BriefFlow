/**
 * Sanitizador de HTML gerado por LLM para slides de carrossel.
 * Remove vetores XSS enquanto preserva inline styles, SVG e HTML semântico.
 */

const DANGEROUS_TAGS = /<(script|object|embed|form|input|button|iframe|frame|frameset|applet|meta|link|base|style)[^>]*>[\s\S]*?<\/\1>|<(script|object|embed|form|input|button|iframe|frame|frameset|applet|meta|link|base|style)[^>]*\/?>/gi;

const DANGEROUS_ATTRS = /\s(on\w+|formaction|action|href\s*=\s*["']?\s*javascript|src\s*=\s*["']?\s*javascript|data\s*=\s*["']?\s*data:text\/html)[^>]*/gi;

const JAVASCRIPT_PROTOCOL = /href\s*=\s*["']?\s*javascript:/gi;

const DATA_URI_SCRIPT = /src\s*=\s*["']?\s*data:\s*text\/html/gi;
const Z_INDEX_DECLARATION = /(^|;)\s*z-index\s*:\s*[^;]+;?/gi;

const STYLE_ATTR = /style=(['"])([\s\S]*?)\1/gi;
const DIV_WITH_STYLE = /<div\b([^>]*?)\sstyle=(['"])([\s\S]*?)\2([^>]*)>/gi;
const DIV_WITHOUT_STYLE = /<div\b((?:(?!\sstyle=)[^>])*)>/gi;

const SATORI_ALLOWED_DISPLAY = new Set(['flex', 'block', 'contents', 'none', '-webkit-box']);

function normalizeDisplayValue(rawValue: string): string {
  const value = rawValue.trim().toLowerCase();

  if (SATORI_ALLOWED_DISPLAY.has(value)) return value;

  if (value === 'inline-flex') return 'flex';
  if (value === 'inline-block' || value === 'inline' || value === 'flow-root') return 'block';
  if (value === 'grid' || value === 'inline-grid') return 'flex';

  return 'block';
}

function normalizeStyleForSatori(styleValue: string): string {
  const cleanedStyle = String(styleValue || '').replace(Z_INDEX_DECLARATION, ';');

  const declarations = cleanedStyle
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const normalized = declarations.map((entry) => {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex === -1) return entry;

    const property = entry.slice(0, separatorIndex).trim().toLowerCase();
    const value = entry.slice(separatorIndex + 1).trim();

    if (property !== 'display') return `${property}:${value}`;
    return `display:${normalizeDisplayValue(value)}`;
  });

  return normalized.join(';');
}

function normalizeUnsupportedDisplay(html: string): string {
  return html.replace(STYLE_ATTR, (_full, quote, styleValue) => {
    const normalizedStyle = normalizeStyleForSatori(styleValue);
    return `style=${quote}${normalizedStyle}${normalizedStyle ? ';' : ''}${quote}`;
  });
}

function ensureExplicitDivDisplay(html: string): string {
  const withDisplayInStyledDivs = html.replace(
    DIV_WITH_STYLE,
    (full, before, quote, styleValue, after) => {
      if (/\bdisplay\s*:/i.test(styleValue)) {
        return full;
      }

      const normalizedStyle = String(styleValue || '').trim();
      const nextStyle = normalizedStyle
        ? `${normalizedStyle}${normalizedStyle.endsWith(';') ? '' : ';'}display:flex;`
        : 'display:flex;';

      return `<div${before} style=${quote}${nextStyle}${quote}${after}>`;
    }
  );

  return withDisplayInStyledDivs.replace(DIV_WITHOUT_STYLE, (_full, attrs) => `<div${attrs} style="display:flex;">`);
}

/**
 * Remove vetores XSS de HTML gerado por LLM.
 * Preserva: inline styles, divs semânticos, SVG inline, tags de texto.
 */
export function sanitizeSlideHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html;

  // Remove tags perigosas e seu conteúdo
  sanitized = sanitized.replace(DANGEROUS_TAGS, '');

  // Remove atributos de evento (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(DANGEROUS_ATTRS, '');

  // Remove URIs javascript: em href
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL, 'href="#"');

  // Remove data URIs de HTML em src
  sanitized = sanitized.replace(DATA_URI_SCRIPT, 'src=""');

  // Satori aceita um subconjunto de display; normaliza valores invalidos (ex: inline-flex).
  sanitized = normalizeUnsupportedDisplay(sanitized);

  // Satori exige display explicito para divs com multiplos filhos.
  sanitized = ensureExplicitDivDisplay(sanitized);

  return sanitized;
}

/**
 * Verifica se o HTML tem as propriedades mínimas esperadas para um slide.
 * Não bloqueia — apenas avisa no log para debugging.
 */
export function validateSlideHtml(html: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!html.includes('1080px')) {
    warnings.push('Dimensões 1080px não encontradas no HTML');
  }

  if (html.includes('<script')) {
    warnings.push('Tag <script> encontrada após sanitização — sanitizer pode ter falhado');
  }

  if (html.includes('onerror') || html.includes('onclick')) {
    warnings.push('Atributo de evento encontrado após sanitização');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
