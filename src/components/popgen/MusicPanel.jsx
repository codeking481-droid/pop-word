import React, { useRef } from 'react';
import { Music, Volume2 } from 'lucide-react';

export default function MusicPanel({ music, setMusic }) {
  const fileRef = useRef(null);
  const update = (patch) => setMusic({ ...music, ...patch });

  const onFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    update({ url, name: file.name });
  };

  return (
    <section>
      <Label icon={<Music className="h-4 w-4" />}>Background Music</Label>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      {!music.url ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-3 text-xs font-medium text-white/60 transition hover:border-[#00FF62]/50 hover:text-white"
        >
          <Music className="h-4 w-4" /> Upload music mp3
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
            <Volume2 className="h-4 w-4 text-[#00FF62]" />
            <span className="flex-1 truncate text-xs text-white/70">{music.name || 'music.mp3'}</span>
            <button onClick={() => update({ url: null, name: '' })} className="text-white/40 hover:text-white text-xs">remove</button>
          </div>
          <button
            onClick={() => update({ enabled: !music.enabled })}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${music.enabled ? 'border-[#00FF62] bg-[#00FF62]/10' : 'border-white/10 bg-black/30'}`}
          >
            <span className="text-sm font-medium text-white/80">Music in video</span>
            <span className={`relative h-6 w-11 rounded-full transition ${music.enabled ? 'bg-[#00FF62]' : 'bg-white/15'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${music.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
          <div>
            <div className="mb-1.5 text-xs font-medium text-white/50">Volume — {Math.round((music.volume ?? 0.6) * 100)}%</div>
            <input type="range" min={0} max={1} step={0.05} value={music.volume ?? 0.6} onChange={(e) => update({ volume: parseFloat(e.target.value) })} className="pop-range w-full" />
          </div>
          <button
            onClick={() => update({ ducking: !music.ducking })}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${music.ducking ? 'border-[#00FF62] bg-[#00FF62]/10' : 'border-white/10 bg-black/30'}`}
          >
            <span className="text-sm font-medium text-white/80">Auto-duck under voice</span>
            <span className={`relative h-6 w-11 rounded-full transition ${music.ducking ? 'bg-[#00FF62]' : 'bg-white/15'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${music.ducking ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

function Label({ children, icon }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
      {icon}
      {children}
    </div>
  );
}