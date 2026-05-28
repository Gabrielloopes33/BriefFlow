export type HtmlTextAlign = 'left' | 'center' | 'right';

export type HtmlFontFamily = 'Space Grotesk' | 'Inter' | 'Merriweather' | 'Outfit';

export type HtmlTextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'mid-left'
  | 'mid'
  | 'mid-right'
  | 'bot-left'
  | 'bot-center'
  | 'bot-right';

export interface HtmlTextStyle {
  text: string;
  color: string;
  fontSize: number;
  fontFamily: HtmlFontFamily;
  fontWeight: 'normal' | 'bold';
  align: HtmlTextAlign;
}

export interface HtmlSlideConfig {
  id: string;
  index: number;
  canvasWidth?: number;
  canvasHeight?: number;
  theme: 'dark' | 'light';
  templateVariant?: 'spotlight' | 'glass-card' | 'editorial-band' | 'minimal';
  backgroundImageUrl?: string;
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundZoom?: number;
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  overlayColor: string;
  overlayOpacity: number;
  textPosition: HtmlTextPosition;
  title: HtmlTextStyle;
  subtitle: HtmlTextStyle;
  ctaButton: {
    visible: boolean;
    text: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
  };
  accentColor: string;
  imagePrompt?: string;
}

export interface HtmlSlideDesignPlan {
  slideIndex: number;
  theme: 'dark' | 'light';
  templateVariant?: 'spotlight' | 'glass-card' | 'editorial-band' | 'minimal';
  backgroundColor: string;
  backgroundGradient?: string;
  overlayColor: string;
  overlayOpacity: number;
  textPosition: HtmlTextPosition;
  titleColor: string;
  subtitleColor: string;
  accentColor: string;
  ctaVisible: boolean;
  ctaText: string;
  ctaBackgroundColor: string;
}
