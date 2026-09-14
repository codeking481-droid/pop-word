import React from 'react';
import { Wand2, Smile, Minimize2, Maximize2, Loader2 } from 'lucide-react';

const ACTIONS = [
  { id: 'viral', label: 'Make Viral', icon: Wand2 },
  { id: 'emojis', label: 'Add Emojis', icon: Smile },
  { id: 'shorten', label: 'Shorten', icon: Minimize2 },
  { id: 'expand', label: 'Expand', icon: Maximize2 },
];

export default function AIScriptTools({ onTransform, busy }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ACTIONS.map((a) => {
        const isBusy = busy === a.id;
        const Icon = isBusy ? Loader2 : a.icon;
        return (
          <button
            key={a.id}
            onClick={() => onTransform && onTransform(a.id)}
            disabled={!!busy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-white/80 transition hover:border-[#00FF62]/50 hover:bg-[#00FF62]/10 hover:text-white disabled:opacity-50"
          >
            <Icon className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}