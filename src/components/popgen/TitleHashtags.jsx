import React, { useState } from 'react';
import { Copy, X, Hash, Type } from 'lucide-react';

export default function TitleHashtags({ titles, hashtags, onClose }) {
  const [copied, setCopied] = useState('');
  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Titles & Hashtags</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50"><Type className="h-4 w-4" /> Viral Titles</div>
          <div className="space-y-2">
            {titles.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                <span className="flex-1 text-sm text-white/90">{t}</span>
                <button onClick={() => copy(t, 't' + i)} className="text-white/40 hover:text-[#00FF62]">
                  {copied === 't' + i ? '✓' : <Copy className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50"><Hash className="h-4 w-4" /> Hashtags</div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((h, i) => (
              <button key={i} onClick={() => copy(h, 'h' + i)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#00FF62] transition hover:bg-[#00FF62]/10">
                {copied === 'h' + i ? '✓ ' : ''}{h}
              </button>
            ))}
          </div>
          <button onClick={() => copy(hashtags.join(' '), 'all')} className="mt-3 w-full rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">
            {copied === 'all' ? '✓ Copied all' : 'Copy all hashtags'}
          </button>
        </div>
      </div>
    </div>
  );
}