/**
 * Tipos do editor visual de criativos
 * Define a estrutura de slides, camadas e templates
 */

import type { HtmlSlideConfig } from '@shared/types/html-slide-config';

export interface SlideBackground {
  type: 'color' | 'gradient' | 'image';
  value: string; // hex, gradient CSS, ou URL
  imagePositionX?: number;
  imagePositionY?: number;
  imageZoom?: number;
}

export type TextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'mid-left'
  | 'mid'
  | 'mid-right'
  | 'bot-left'
  | 'bot-center'
  | 'bot-right';

export type FontFamily =
  | 'Inter'
  | 'Space'
  | 'Syne'
  | 'Outfit'
  | 'DM Sans'
  | 'Raleway'
  | 'Oswald'
  | 'Playfair'
  | 'Caveat';

export interface SlideOverlay {
  style: 'none' | 'base' | 'base-forte' | 'topo-forte' | 'diag-inf-dir' | 'diag-sup-esq';
  opacity: number;
  color: string;
}

export interface ImagePlacement {
  type: 'background' | 'inset-top' | 'inset-mid' | 'inset-bottom' | 'side-right' | 'side-left' | 'inset-small-mid';
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  objectFit: 'cover' | 'contain';
}

export interface SlideImageGrid {
  visible: boolean;
  imageUrl?: string;
  borderRadius?: number;
  placement?: ImagePlacement;
}

export interface SlideTextLayout {
  position: TextPosition;
  alignment: 'left' | 'center' | 'right';
  title: string;
  subtitle: string;
}

export interface SlideTypography {
  globalScale: number;
  titleFontSize: number;
  titleFontFamily: FontFamily;
  subtitleFontSize: number;
  accentColor: string;
  accentWords: string[];
}

export interface SlideProfileBadge {
  visible: boolean;
  imageUrl?: string;
  name: string;
  handle: string;
  style: 'solid' | 'minimal' | 'glass';
  size: number;
  position: TextPosition;
}

export interface SlideCtaButton {
  visible: boolean;
  text: string;
  style: 'filled' | 'outline' | 'glass';
  size: number;
  borderRadius: number;
  backgroundColor: string;
  textColor: string;
}

export interface FontCombination {
  title: FontFamily;
  body: FontFamily;
}

export interface ProfileConfig {
  photoUrl?: string;
  name: string;
  handle: string;
  badgeStyle: 'solid' | 'minimal' | 'glass';
  thumbnailCount: 1 | 2 | 'alternating';
  borderRadius: number;
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
  theme?: 'dark' | 'light';
  background: SlideBackground;
  overlay?: SlideOverlay;
  imageGrid?: SlideImageGrid;
  textLayout?: SlideTextLayout;
  typography?: SlideTypography;
  profileBadge?: SlideProfileBadge;
  ctaButton?: SlideCtaButton;
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
    format?: 'square' | 'portrait' | 'story';
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
  format?: 'square' | 'portrait' | 'story';
  canvasWidth?: number;
  canvasHeight?: number;
  layoutMode?: 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter';
  profileConfig?: ProfileConfig | null;
  fontCombination?: FontCombination;
  accentColor?: string;
  instagramHandle?: string;
  slides: Slide[];
  htmlSlideConfigs?: HtmlSlideConfig[];
  htmlSlides?: string[];
  exportUrls: string[];
  status: 'draft' | 'ready' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface GenerateCarouselDto {
  clientId: string;
  prompt: string;
  referenceImageUrl?: string;
  slidesCount: number;
  imageMode?: 'background' | 'grid' | 'both';
  imageStyleHint?: string;
  layoutMode?: 'minimalist' | 'profile' | 'editorial' | 'bold' | 'split' | 'cinematic' | 'twitter';
  format: 'square' | 'portrait' | 'story';
  instagramHandle?: string;
  fontCombination?: FontCombination;
  accentColor?: string;
  imageModel?: 'schnell' | 'dev';
  generateImages: boolean;
  textDepth?: 'concise' | 'detailed';
  templateStrategy?: 'predefined' | 'ai';
}

export interface GenerateCarouselResponse {
  job_id: string;
  creativeId?: string;
  message: string;
}

export interface GenerateCarouselJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  creativeId?: string;
  error?: string;
}

export interface RefineSlideResponse {
  index: number;
  textLayout: SlideTextLayout;
}

export interface GenerateCaptionResponse {
  caption: string;
  hashtags: string[];
}

export interface EditorState {
  currentSlideIndex: number;
  selectedLayerId: string | null;
  slides: Slide[];
  canvasSize: { width: number; height: number };
}
