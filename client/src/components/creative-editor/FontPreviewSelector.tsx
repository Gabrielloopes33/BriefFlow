/**
 * FontPreviewSelector — Seletor de fontes com preview visual
 * Cada opção renderiza com a própria fonte aplicada
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FONT_OPTIONS } from './TextEditPanel';
import { FONT_NAME_MAP } from './FontLoader';

interface FontPreviewSelectorProps {
  value: string;
  onChange: (font: string) => void;
}

export function FontPreviewSelector({ value, onChange }: FontPreviewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = FONT_NAME_MAP[value] || value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs text-foreground hover:bg-secondary/60 transition-colors"
      >
        <span style={{ fontFamily: selectedLabel }}>{selectedLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border/60 bg-popover shadow-lg">
          {FONT_OPTIONS.map((font: string) => {
            const displayName = FONT_NAME_MAP[font] || font;
            const isSelected = font === value;
            return (
              <button
                key={font}
                type="button"
                onClick={() => {
                  onChange(font);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary/50'
                }`}
              >
                <span style={{ fontFamily: displayName }} className="truncate">
                  {displayName}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
