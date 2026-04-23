import { describe, it, expect } from 'vitest';
import {
  resolvePlaceholders,
  fillSlideLayers,
  fillCreativeSlides,
  PLACEHOLDER_MAP,
} from './template-placeholder-map';
import type { Creative, Slide } from './creative-editor-types';

describe('template-placeholder-map', () => {
  const mockPost = { title: 'Meu Título', content: 'Primeiro parágrafo.\nSegundo parágrafo.' };
  const mockClient = { name: 'BriefFlow', handle: '@briefflow' };

  describe('PLACEHOLDER_MAP', () => {
    it('resolves {{headline}} to post title', () => {
      expect(PLACEHOLDER_MAP['{{headline}}'](mockPost, mockClient)).toBe('Meu Título');
    });

    it('resolves {{body}} to first paragraph', () => {
      expect(PLACEHOLDER_MAP['{{body}}'](mockPost, mockClient)).toBe('Primeiro parágrafo.');
    });

    it('resolves {{client_handle}} to client handle', () => {
      expect(PLACEHOLDER_MAP['{{client_handle}}'](mockPost, mockClient)).toBe('@briefflow');
    });

    it('generates handle from name when handle not provided', () => {
      expect(PLACEHOLDER_MAP['{{client_handle}}'](mockPost, { name: 'Test Co' })).toBe('@testco');
    });

    it('resolves {{client_name}} to client name', () => {
      expect(PLACEHOLDER_MAP['{{client_name}}'](mockPost, mockClient)).toBe('BriefFlow');
    });
  });

  describe('resolvePlaceholders', () => {
    it('replaces all placeholders in text', () => {
      const text = '{{headline}} - by {{client_handle}}';
      expect(resolvePlaceholders(text, mockPost, mockClient)).toBe('Meu Título - by @briefflow');
    });

    it('returns text unchanged when no placeholders', () => {
      expect(resolvePlaceholders('Hello world', mockPost, mockClient)).toBe('Hello world');
    });

    it('resolves slide placeholders', () => {
      const slides = [
        { title: 'Slide 1', body: 'Body 1' },
        { title: 'Slide 2', body: 'Body 2' },
      ];
      const text = '{{slide_title_1}}: {{slide_body_1}}';
      expect(resolvePlaceholders(text, mockPost, mockClient, slides)).toBe('Slide 1: Body 1');
    });

    it('returns empty string for missing slide content', () => {
      const text = '{{slide_title_99}}';
      expect(resolvePlaceholders(text, mockPost, mockClient, [])).toBe('');
    });
  });

  describe('fillSlideLayers', () => {
    it('fills text layers with placeholders', () => {
      const slide = {
        layers: [
          { id: '1', type: 'text' as const, text: '{{headline}}', placeholder: '{{headline}}' },
          { id: '2', type: 'text' as const, text: 'Static', placeholder: undefined },
        ],
      };
      fillSlideLayers(slide, mockPost, mockClient);
      expect(slide.layers[0].text).toBe('Meu Título');
      expect(slide.layers[1].text).toBe('Static');
    });
  });

  describe('fillCreativeSlides', () => {
    it('fills all slides in a creative', () => {
      const creative: Creative = {
        id: 'c1',
        tenantId: 't1',
        clientId: 'cl1',
        postId: null,
        templateId: null,
        type: 'carousel',
        platform: 'instagram',
        slides: [
          {
            id: 's1',
            index: 0,
            background: { type: 'color', value: '#fff' },
            layers: [
              { id: 'l1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: '{{headline}}', fontSize: 24, fontWeight: 'bold', color: '#000', align: 'center', editable: true, placeholder: '{{headline}}' },
            ],
          },
        ],
        exportUrls: [],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const filled = fillCreativeSlides(creative, mockPost, mockClient);
      expect(filled.slides[0].layers[0].text).toBe('Meu Título');
    });
  });
});
