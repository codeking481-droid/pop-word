import React from 'react';
import { TrendingUp, X, Lightbulb } from 'lucide-react';

export default function ViralScore({ score, tips, onClose }) {
  const color = score >= 80 ? '#00FF62' : score >= 60 ? '#FFD700' : '#FF6B6B';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color }} />
            <span className="text-sm font-semibold uppercase tracking-wider text-white/60">Viral Score</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-5 flex items-end gap-2">
          <span className="text-6xl font-black" style={{ color }}>
            {score}
          </span>
          <span className="mb-2 text-lg text-white/40">/ 100</span>
        </div>

        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>

        {tips.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
              <Lightbulb className="h-4 w-4" /> Tips to score higher
            </div>
            {tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                {t}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#00FF62] py-3 text-sm font-bold text-black transition hover:opacity-90"
        >
          Nice — keep editing
        </button>
      </div>
    </div>
  );
}