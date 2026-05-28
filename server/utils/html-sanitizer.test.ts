import { describe, it, expect } from 'vitest';
import { sanitizeSlideHtml, validateSlideHtml } from './html-sanitizer';

describe('sanitizeSlideHtml', () => {
  it('removes <script> tags and their content', () => {
    const input = '<div>Hello</div><script>alert("xss")</script>';
    expect(sanitizeSlideHtml(input)).not.toContain('<script');
    expect(sanitizeSlideHtml(input)).not.toContain('alert');
  });

  it('removes onerror event attributes', () => {
    const input = '<img onerror="alert(1)" src="x">';
    const result = sanitizeSlideHtml(input);
    expect(result).not.toContain('onerror');
  });

  it('removes onclick event attributes', () => {
    const input = '<div onclick="evil()">click</div>';
    const result = sanitizeSlideHtml(input);
    expect(result).not.toContain('onclick');
  });

  it('removes javascript: href from anchor tags', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeSlideHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('removes data: text/html src', () => {
    const input = '<iframe src="data:text/html,<script>xss</script>"></iframe>';
    const result = sanitizeSlideHtml(input);
    expect(result).not.toContain('data:text/html');
  });

  it('preserves safe inline styles', () => {
    const input = '<div style="color:red;font-size:24px">Hello</div>';
    const result = sanitizeSlideHtml(input);
    expect(result).toContain('style="color:red;font-size:24px;display:flex;"');
  });

  it('preserves semantic HTML tags', () => {
    const input = '<h1>Title</h1><p>Body</p>';
    const result = sanitizeSlideHtml(input);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>Body</p>');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeSlideHtml('')).toBe('');
    expect(sanitizeSlideHtml(null as any)).toBe('');
  });

  it('removes <style> tags', () => {
    const input = '<style>.evil { display: none }</style><div>safe</div>';
    const result = sanitizeSlideHtml(input);
    expect(result).not.toContain('<style');
  });

  it('injects display:flex on div without explicit display style', () => {
    const input = '<div><span>a</span><span>b</span></div>';
    const result = sanitizeSlideHtml(input);
    expect(result).toContain('style="display:flex;"');
  });

  it('keeps existing display style unchanged', () => {
    const input = '<div style="display:flex;gap:8px"><span>a</span><span>b</span></div>';
    const result = sanitizeSlideHtml(input);
    expect(result).toContain('style="display:flex;gap:8px;"');
  });

  it('appends display:flex when style exists but display is absent', () => {
    const input = '<div style="position:relative;z-index:1;"><span>a</span><span>b</span></div>';
    const result = sanitizeSlideHtml(input);
    expect(result).toContain('position:relative;display:flex;');
    expect(result).not.toContain('z-index');
  });

  it('normalizes display:inline-flex to display:flex', () => {
    const input = '<div style="display:inline-flex;align-items:center">CTA</div>';
    const result = sanitizeSlideHtml(input);
    expect(result).toContain('style="display:flex;align-items:center;"');
  });
});

describe('validateSlideHtml', () => {
  it('warns when 1080px is missing', () => {
    const { valid, warnings } = validateSlideHtml('<div>no dimensions</div>');
    expect(valid).toBe(false);
    expect(warnings.some((w) => w.includes('1080px'))).toBe(true);
  });

  it('passes for compliant slide HTML', () => {
    const html = '<div style="width:1080px;height:1080px">slide</div>';
    const { valid } = validateSlideHtml(html);
    expect(valid).toBe(true);
  });
});
