import React from 'react';
import { GRADIENTS, IMAGES, SOLIDS } from './data/backgroundPresets';
import { Upload } from 'lucide-react';

const TYPES = [
  { id: 'stars', label: 'Stars' },
  { id: 'galaxy', label: 'Galaxy' },
  { id: 'grid', label: 'Grid' },
  { id: 'black', label: 'Black' },
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image', label: 'Image' },
];

function BgThumb({ id, options }) {
  if (id === 'stars') return <div className="relative h-full w-full bg-black"><div className="stars-thumb" /></div>;
  if (id === 'galaxy') return <div className="h-full w-full bg-gradient-to-br from-[#1a0b3e] via-[#3d0b5e] to-[#0a0118]" />;
  if (id === 'grid') return <div className="relative h-full w-full bg-[#070707] grid-thumb" />;
  if (id === 'black') return <div className="h-full w-full bg-black" />;
  if (id === 'solid') return <div className="h-full w-full" style={{ background: options.bgColor || '#000' }} />;
  if (id === 'gradient') {
    const c = options.gradientColors || GRADIENTS[0];
    return <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${c[0]}, ${c[1]})` }} />;
  }
  if (id === 'image') return <img src={options.bgImage || IMAGES[0]} alt="" className="h-full w-full object-cover" />;
  return <div className="flex h-full w-full items-center justify-center bg-[#121212] text-white/40"><Upload className="h-5 w-5" /></div>;
}

export default function BackgroundSection({ options, update }) {
  return (
    <section>
      <Label>Background</Label>
      <div className="grid grid-cols-4 gap-2">
        {TYPES.map((b) => (
          <button
            key={b.id}
            onClick={() => update({ background: b.id })}
            className={`group relative overflow-hidden rounded-xl border transition ${
              options.background === b.id ? 'border-[#00FF62] ring-2 ring-[#00FF62]/40' : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="aspect-[9/16] w-full">
              <BgThumb id={b.id} options={options} />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1">
              <div className="truncate text-[10px] font-semibold text-white">{b.label}</div>
            </div>
          </button>
        ))}
      </div>

      {options.background === 'solid' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SOLIDS.map((c) => (
            <button
              key={c}
              onClick={() => update({ bgColor: c })}
              className={`h-7 w-7 rounded-full border-2 transition ${options.bgColor === c ? 'border-[#00FF62]' : 'border-white/20'}`}
              style={{ background: c }}
            />
          ))}
          <input type="color" value={options.bgColor || '#000000'} onChange={(e) => update({ bgColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
        </div>
      )}

      {options.background === 'gradient' && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {GRADIENTS.map((c, i) => (
            <button
              key={i}
              onClick={() => update({ gradientColors: c })}
              className={`h-9 rounded-lg border-2 transition ${(options.gradientColors || [])[0] === c[0] ? 'border-[#00FF62]' : 'border-white/10'}`}
              style={{ background: `linear-gradient(135deg, ${c[0]}, ${c[1]})` }}
            />
          ))}
        </div>
      )}

      {options.background === 'image' && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {IMAGES.map((u, i) => (
            <button
              key={i}
              onClick={() => update({ bgImage: u })}
              className={`overflow-hidden rounded-lg border-2 transition ${options.bgImage === u ? 'border-[#00FF62]' : 'border-white/10'}`}
            >
              <img src={u} alt="" className="aspect-[9/16] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Label({ children }) {
  return <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/50">{children}</div>;
}