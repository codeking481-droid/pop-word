import React from 'react';
import { Layers, Loader2, Play } from 'lucide-react';

export default function BatchPanel({ value, onChange, onGenerate, progress }) {
  const count = value.split(/\n-{3,}\n|\n---\n|^---\n|\n---$/m).filter((s) => s.trim()).length;

  return (
    <section>
      <Label icon={<Layers className="h-4 w-4" />}>Batch Mode</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Paste scripts separated by ---\n\nScript one\n---\nScript two\n---\nScript three'}
        className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-white placeholder:text-white/30 outline-none transition focus:border-[#00FF62]/60"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-white/40">{count} script{count === 1 ? '' : 's'} queued</span>
        <button
          onClick={onGenerate}
          disabled={!count || !!progress}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          {progress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {progress ? `Rendering ${progress.current}/${progress.total}` : `Generate ${count} Video${count === 1 ? '' : 's'}`}
        </button>
      </div>
      {progress && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#00FF62] transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
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