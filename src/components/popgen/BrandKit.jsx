import React, { useRef } from 'react';
import { Palette, Image as ImageIcon, X } from 'lucide-react';

export default function BrandKit({ options, update }) {
  const fileRef = useRef(null);

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ brandLogo: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <section>
      <Label icon={<Palette className="h-4 w-4" />}>Brand Kit</Label>
      <button
        onClick={() => update({ brandEnabled: !options.brandEnabled })}
        className={`mb-3 flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${options.brandEnabled ? 'border-[#00FF62] bg-[#00FF62]/10' : 'border-white/10 bg-black/30'}`}
      >
        <span className="text-sm font-medium text-white/80">Brand kit on</span>
        <span className={`relative h-6 w-11 rounded-full transition ${options.brandEnabled ? 'bg-[#00FF62]' : 'bg-white/15'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${options.brandEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>

      {options.brandEnabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
        <input type="color" value={options.brandColor || '#00FF62'} onChange={(e) => update({ brandColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="text-xs font-mono text-white/70">Brand {options.brandColor || '#00FF62'}</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-3 text-xs font-medium text-white/60 transition hover:border-[#00FF62]/50 hover:text-white"
      >
        <ImageIcon className="h-4 w-4" />
        {options.brandLogo ? 'Change logo' : 'Upload logo'}
      </button>
      {options.brandLogo && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
          <img src={options.brandLogo} alt="logo" className="h-8 w-8 rounded object-contain" />
          <span className="flex-1 truncate text-xs text-white/60">Logo bottom-right</span>
          <button onClick={() => update({ brandLogo: null })} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
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