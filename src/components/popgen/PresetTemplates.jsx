import React from 'react';

const PRESETS = [
  { id: 'neon', label: 'Neon Pop', patch: { background: 'stars', textColor: '#00FF62', animation: 'Pop', font: 'Bold', uppercase: true, showProgressbar: true, autoHighlight: false } },
  { id: 'hype', label: 'Hype', patch: { background: 'grid', textColor: '#FF2E63', animation: 'Shake', font: 'Extra Bold', uppercase: true, showProgressbar: true, autoHighlight: true, highlightColor: '#FFD700' } },
  { id: 'cinema', label: 'Cinematic', patch: { background: 'galaxy', textColor: '#FFD700', animation: 'Glow Pop', font: 'Anton', uppercase: false, showProgressbar: false, autoHighlight: true, highlightColor: '#FFFFFF' } },
  { id: 'minimal', label: 'Minimal', patch: { background: 'black', textColor: '#FFFFFF', animation: 'Typewriter', font: 'Bold', uppercase: false, showProgressbar: false, autoHighlight: false } },
  { id: 'sticker', label: 'Sticker', patch: { background: 'stars', textColor: '#00FF62', animation: 'Sticker Pop', font: 'Extra Bold', uppercase: true, showProgressbar: true, autoHighlight: false } },
  { id: 'glitch', label: 'Glitch', patch: { background: 'grid', textColor: '#00E5FF', animation: 'Glitch', font: 'Extra Bold', uppercase: true, showProgressbar: true, autoHighlight: true, highlightColor: '#FF2E63' } },
];

export default function PresetTemplates({ onApply }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onApply && onApply(p.patch)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-[#00FF62] hover:bg-[#00FF62]/10 hover:text-white"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}