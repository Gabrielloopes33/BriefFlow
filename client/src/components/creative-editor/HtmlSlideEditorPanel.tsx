import type { HtmlSlideConfig, HtmlTextPosition, HtmlFontFamily } from '@shared/types/html-slide-config';

interface HtmlSlideEditorPanelProps {
  config: HtmlSlideConfig;
  onConfigChange: (next: HtmlSlideConfig) => void;
  readOnly?: boolean;
}

const POSITIONS: HtmlTextPosition[] = [
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

const FONTS: HtmlFontFamily[] = ['Space Grotesk', 'Inter', 'Outfit', 'Merriweather'];

function sectionTitle(label: string) {
  return <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mt-4 mb-2">{label}</h3>;
}

export function HtmlSlideEditorPanel({ config, onConfigChange, readOnly = false }: HtmlSlideEditorPanelProps) {
  const disabled = readOnly;

  return (
    <div className="p-3 space-y-2 text-sm">
      {sectionTitle('Tema')}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`rounded border px-2 py-1 ${config.theme === 'dark' ? 'border-primary text-primary' : 'border-border'}`}
          onClick={() => onConfigChange({ ...config, theme: 'dark' })}
          disabled={disabled}
        >
          Dark
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${config.theme === 'light' ? 'border-primary text-primary' : 'border-border'}`}
          onClick={() => onConfigChange({ ...config, theme: 'light' })}
          disabled={disabled}
        >
          Light
        </button>
      </div>

      {sectionTitle('Posicao do texto')}
      <div className="grid grid-cols-3 gap-1">
        {POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            className={`rounded border px-1 py-1 text-[11px] ${config.textPosition === position ? 'border-primary text-primary' : 'border-border'}`}
            onClick={() => onConfigChange({ ...config, textPosition: position })}
            disabled={disabled}
          >
            {position}
          </button>
        ))}
      </div>

      {sectionTitle('Titulo')}
      <textarea
        className="w-full rounded border border-border bg-background px-2 py-1"
        value={config.title.text}
        onChange={(e) => onConfigChange({ ...config, title: { ...config.title, text: e.target.value } })}
        rows={3}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="color"
          value={config.title.color}
          onChange={(e) => onConfigChange({ ...config, title: { ...config.title, color: e.target.value } })}
          disabled={disabled}
        />
        <input
          type="range"
          min={24}
          max={96}
          value={config.title.fontSize}
          onChange={(e) => onConfigChange({ ...config, title: { ...config.title, fontSize: Number(e.target.value) } })}
          disabled={disabled}
        />
      </div>
      <select
        className="w-full rounded border border-border bg-background px-2 py-1"
        value={config.title.fontFamily}
        onChange={(e) => onConfigChange({ ...config, title: { ...config.title, fontFamily: e.target.value as HtmlFontFamily } })}
        disabled={disabled}
      >
        {FONTS.map((font) => (
          <option key={font} value={font}>{font}</option>
        ))}
      </select>

      {sectionTitle('Subtitulo')}
      <textarea
        className="w-full rounded border border-border bg-background px-2 py-1"
        value={config.subtitle.text}
        onChange={(e) => onConfigChange({ ...config, subtitle: { ...config.subtitle, text: e.target.value } })}
        rows={3}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="color"
          value={config.subtitle.color}
          onChange={(e) => onConfigChange({ ...config, subtitle: { ...config.subtitle, color: e.target.value } })}
          disabled={disabled}
        />
        <input
          type="range"
          min={16}
          max={48}
          value={config.subtitle.fontSize}
          onChange={(e) => onConfigChange({ ...config, subtitle: { ...config.subtitle, fontSize: Number(e.target.value) } })}
          disabled={disabled}
        />
      </div>

      {sectionTitle('Imagem de fundo')}
      <input
        type="url"
        className="w-full rounded border border-border bg-background px-2 py-1"
        value={config.backgroundImageUrl || ''}
        onChange={(e) => onConfigChange({ ...config, backgroundImageUrl: e.target.value || undefined })}
        placeholder="https://..."
        disabled={disabled}
      />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          Zoom
          <input
            type="range"
            min={100}
            max={200}
            value={config.backgroundZoom ?? 100}
            onChange={(e) => onConfigChange({ ...config, backgroundZoom: Number(e.target.value) })}
            disabled={disabled}
          />
        </label>
        <label className="flex flex-col gap-1">
          Pos X
          <input
            type="range"
            min={0}
            max={100}
            value={config.backgroundPositionX ?? 50}
            onChange={(e) => onConfigChange({ ...config, backgroundPositionX: Number(e.target.value) })}
            disabled={disabled}
          />
        </label>
        <label className="flex flex-col gap-1">
          Pos Y
          <input
            type="range"
            min={0}
            max={100}
            value={config.backgroundPositionY ?? 50}
            onChange={(e) => onConfigChange({ ...config, backgroundPositionY: Number(e.target.value) })}
            disabled={disabled}
          />
        </label>
      </div>

      {sectionTitle('Overlay')}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="color"
          value={config.overlayColor}
          onChange={(e) => onConfigChange({ ...config, overlayColor: e.target.value })}
          disabled={disabled}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={config.overlayOpacity}
          onChange={(e) => onConfigChange({ ...config, overlayOpacity: Number(e.target.value) })}
          disabled={disabled}
        />
      </div>

      {sectionTitle('Cor destaque')}
      <input
        type="color"
        value={config.accentColor}
        onChange={(e) => onConfigChange({ ...config, accentColor: e.target.value })}
        disabled={disabled}
      />

      {sectionTitle('CTA')}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={config.ctaButton.visible}
          onChange={(e) => onConfigChange({ ...config, ctaButton: { ...config.ctaButton, visible: e.target.checked } })}
          disabled={disabled}
        />
        Mostrar botao
      </label>
      <input
        className="w-full rounded border border-border bg-background px-2 py-1"
        value={config.ctaButton.text}
        onChange={(e) => onConfigChange({ ...config, ctaButton: { ...config.ctaButton, text: e.target.value } })}
        placeholder="Texto do CTA"
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="color"
          value={config.ctaButton.backgroundColor}
          onChange={(e) => onConfigChange({ ...config, ctaButton: { ...config.ctaButton, backgroundColor: e.target.value } })}
          disabled={disabled}
        />
        <input
          type="color"
          value={config.ctaButton.textColor}
          onChange={(e) => onConfigChange({ ...config, ctaButton: { ...config.ctaButton, textColor: e.target.value } })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
