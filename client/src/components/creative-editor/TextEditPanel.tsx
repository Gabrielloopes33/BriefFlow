/**
 * Painel de propriedades do texto selecionado
 * Permite editar cor, tamanho da fonte, alinhamento
 */

import { Type, AlignLeft, AlignCenter, AlignRight, Bold } from 'lucide-react';
import type { TextLayer } from '@/lib/creative-editor-types';

interface TextEditPanelProps {
  layer: TextLayer | null;
  onChange: (updates: Partial<TextLayer>) => void;
}

const PRESET_COLORS = [
  '#ffffff', '#000000', '#1a1a2e', '#667eea', '#764ba2',
  '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
];

export function TextEditPanel({ layer, onChange }: TextEditPanelProps) {
  if (!layer) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        Selecione um texto para editar
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Type className="w-4 h-4" />
        <span>Propriedades do Texto</span>
      </div>

      {/* Tamanho da fonte */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 font-medium">Tamanho</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={12}
            max={120}
            value={layer.fontSize}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value, 10) })}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs font-mono w-8 text-right">{layer.fontSize}px</span>
        </div>
      </div>

      {/* Peso da fonte */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 font-medium">Peso</label>
        <div className="flex gap-1">
          <button
            onClick={() => onChange({ fontWeight: 'normal' })}
            className={`flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors ${
              layer.fontWeight === 'normal'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => onChange({ fontWeight: 'bold' })}
            className={`flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors flex items-center justify-center gap-1 ${
              layer.fontWeight === 'bold'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Bold className="w-3 h-3" />
            Bold
          </button>
        </div>
      </div>

      {/* Cor */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 font-medium">Cor</label>
        <div className="grid grid-cols-5 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ color })}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                layer.color === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <input
          type="color"
          value={layer.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="w-full h-8 rounded-md border border-gray-200 cursor-pointer mt-1"
        />
      </div>

      {/* Alinhamento */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 font-medium">Alinhamento</label>
        <div className="flex gap-1">
          {([
            { value: 'left', icon: AlignLeft },
            { value: 'center', icon: AlignCenter },
            { value: 'right', icon: AlignRight },
          ] as const).map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange({ align: value })}
              className={`flex-1 py-1.5 px-2 rounded-md border transition-colors flex items-center justify-center ${
                layer.align === value
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title={value}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
