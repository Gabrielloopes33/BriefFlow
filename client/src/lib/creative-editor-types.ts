/**
 * Tipos do Editor Visual Konva
 * Define a estrutura de slides, camadas e templates
 */

export interface SlideBackground {
  type: 'color' | 'gradient' | 'image';
  value: string; // hex, gradient CSS, ou URL
}

export interface BaseLayer {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  editable: boolean;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter';
  fontFamily?: string;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight?: number;
  placeholder?: string; // ex: "{{headline}}", "{{body}}"
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  placeholder?: string;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

export interface Slide {
  id: string;
  index: number;
  background: SlideBackground;
  layers: Layer[];
}

export interface CreativeTemplate {
  id: string;
  tenantId: string | null;
  name: string;
  type: 'carousel' | 'single' | 'story' | 'ad';
  platform: 'instagram' | 'linkedin' | 'facebook' | 'universal';
  slidesCount: number;
  structure: {
    width: number;
    height: number;
    slides: Slide[];
  };
  thumbnailUrl: string | null;
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Creative {
  id: string;
  tenantId: string;
  clientId: string;
  postId: string | null;
  templateId: string | null;
  type: 'carousel' | 'single' | 'story' | 'ad';
  platform: string;
  slides: Slide[];
  exportUrls: string[];
  status: 'draft' | 'ready' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface EditorState {
  currentSlideIndex: number;
  selectedLayerId: string | null;
  slides: Slide[];
  canvasSize: { width: number; height: number };
}
