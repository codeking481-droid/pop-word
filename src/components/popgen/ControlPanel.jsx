import React, { useRef, useState } from 'react';
import { Sparkles, Upload, Wand2, Film, X, Image as ImageIcon, Plus } from 'lucide-react';
import AIScriptTools from './AIScriptTools';
import VoiceoverPanel from './VoiceoverPanel';
import PresetTemplates from './PresetTemplates';
import BatchPanel from './BatchPanel';
import BackgroundSection from './BackgroundSection';
import NamedTemplates from './NamedTemplates';
import BrandKit from './BrandKit';
import MusicPanel from './MusicPanel';

const FONTS = ['Bold', 'Extra Bold', 'Anton'];
const ANIMATIONS = [
  'Pop',
  'Bounce',
  'Typewriter',
  'Glow Pop',
  'Slide Up',
  'Shake',
  'Neon Flicker',
  'Glitch',
  'Karaoke',
  'Shimmer',
  'Sticker Pop',
  'Wave',
  'Green Box',
  'Yellow Stroke',
  'Scale Shadow',
  'Fade Up',
  'Word Highlight',
  'Caption Style',
];
const ASPECTS = [
  { id: '9:16', label: '9:16', hint: 'Vertical' },
  { id: '16:9', label: '16:9', hint: 'Landscape' },
  { id: '1:1', label: '1:1', hint: 'Square' },
  { id: '4:5', label: '4:5', hint: 'Portrait' },
];

function MediaThumb({ item }) {
  if (item.type === 'video') {
    return <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }
  return <img src={item.url} alt="" className="h-full w-full object-cover" />;
}

export default function ControlPanel({ options, setOptions, onGenerate, exporting, onAddMedia, onSelectMedia, onRemoveMedia, onAITransform, aiBusy, voiceover, setVoiceover, onGenerateVoiceover, onApplyPreset, onPidgin, batchScripts, setBatchScripts, onGenerateBatch, batchProgress, music, setMusic, onGenerateThumbnail, onGenerateTitles, onMultiExport, multiExporting }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState(options.mode === 'caption' ? 'caption' : 'pop');
  const busy = !!exporting;

  const update = (patch) => setOptions({ ...options, ...patch });

  const openPicker = () => fileRef.current?.click();

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(
      (f) => f.type.startsWith('image') || f.type.startsWith('video')
    );
    if (files.length && onAddMedia) onAddMedia(files);
  };

  return (
    <div
      className="relative flex h-full flex-col gap-6 overflow-y-auto p-5 lg:p-6"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-30 m-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#00FF62] bg-[#00FF62]/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-[#00FF62]">
            <Upload className="h-8 w-8" />
            <div className="text-sm font-bold">Drop images or videos</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/40 p-1">
        {['pop', 'caption', 'batch'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t !== 'batch') update({ mode: t }); }}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${tab === t ? 'bg-[#00FF62] text-black' : 'text-white/60 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'batch' ? (
        <BatchPanel value={batchScripts || ''} onChange={setBatchScripts} onGenerate={onGenerateBatch} progress={batchProgress} />
      ) : (
      <>
      {/* Script */}
      <section>
        <Label icon={<Sparkles className="h-4 w-4" />}>Your Script</Label>
        <textarea
          value={options.script}
          onChange={(e) => update({ script: e.target.value })}
          placeholder="Paste your full script here..."
          className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-white placeholder:text-white/30 outline-none transition focus:border-[#00FF62]/60 focus:ring-2 focus:ring-[#00FF62]/20"
        />
        <div className="mt-1.5 text-right text-xs text-white/40">
          {options.script.trim() ? options.script.trim().split(/\s+/).filter(Boolean).length : 0} words
        </div>
        <div className="mt-2.5">
          <Label icon={<Wand2 className="h-4 w-4" />}>AI Script Tools</Label>
          <AIScriptTools onTransform={onAITransform} busy={aiBusy} />
          <button
            onClick={onPidgin}
            className="mt-2 w-full rounded-xl border border-[#FF6B35]/40 bg-[#FF6B35]/10 px-3 py-2 text-xs font-bold text-[#FFB088] transition hover:bg-[#FF6B35]/20"
          >
            🇳🇬 Translate to Pidgin (Naija)
          </button>
        </div>
      </section>

      {/* Aspect ratio */}
      <section>
        <Label>Aspect Ratio</Label>
        <div className="flex gap-2">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              onClick={() => update({ aspect: a.id })}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition ${
                options.aspect === a.id
                  ? 'border-[#00FF62] bg-[#00FF62]/10 text-white'
                  : 'border-white/10 bg-black/30 text-white/60 hover:border-white/25'
              }`}
            >
              <span className="text-sm font-bold">{a.label}</span>
              <span className="text-[10px] opacity-60">{a.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section>
        <Label>Quick Templates</Label>
        <PresetTemplates onApply={onApplyPreset} />
      </section>

      <NamedTemplates onApply={onApplyPreset} />

      {/* Background */}
      <BackgroundSection options={options} update={update} />

      {/* Media library */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <Label>Your Media</Label>
          <span className="text-xs text-white/40">{options.mediaLibrary?.length || 0} items</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        {options.mediaLibrary?.length ? (
          <div className="grid grid-cols-3 gap-2">
            {options.mediaLibrary.map((m) => (
              <div
                key={m.id}
                onClick={() => onSelectMedia && onSelectMedia(m)}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border transition ${
                  options.background === 'custom' && options.customMedia === m.element
                    ? 'border-[#00FF62] ring-2 ring-[#00FF62]/40'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="aspect-[9/16] w-full bg-black">
                  <MediaThumb item={m} />
                </div>
                {m.type === 'video' && (
                  <div className="absolute left-1 top-1 rounded bg-black/70 p-0.5">
                    <Film className="h-3 w-3 text-white" />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveMedia && onRemoveMedia(m.id); }}
                  className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={openPicker}
              className="flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-dashed border-white/20 text-white/40 transition hover:border-[#00FF62]/50 hover:text-[#00FF62]"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        ) : (
          <button
            onClick={openPicker}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 py-6 text-white/50 transition hover:border-[#00FF62]/50 hover:text-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium">Add images or videos</div>
            <div className="text-[10px] text-white/30">Click or drag & drop anywhere</div>
          </button>
        )}
      </section>

      {/* Caption style */}
      <section>
        <Label>Caption Style</Label>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Text Color">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <input
                  type="color"
                  value={options.textColor}
                  onChange={(e) => update({ textColor: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-xs font-mono text-white/70">{options.textColor}</span>
              </div>
            </Field>
            <Field label="Font">
              <div className="flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                {FONTS.map((f) => (
                  <button
                    key={f}
                    onClick={() => update({ font: f })}
                    className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition ${
                      options.font === f ? 'bg-[#00FF62] text-black' : 'text-white/60 hover:text-white'
                    } ${f === 'Anton' ? 'font-normal' : f === 'Extra Bold' ? 'font-black' : 'font-bold'}`}
                  >
                    {f === 'Extra Bold' ? 'Extra' : f}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Animation">
            <select
              value={options.animation}
              onChange={(e) => update({ animation: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00FF62]/60"
            >
              {ANIMATIONS.map((a) => (
                <option key={a} value={a} className="bg-[#121212]">
                  {a}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`Word Duration — ${options.wordDuration.toFixed(2)}s`}>
            <input
              type="range"
              min={0.15}
              max={1.5}
              step={0.05}
              value={options.wordDuration}
              onChange={(e) => update({ wordDuration: parseFloat(e.target.value) })}
              className="pop-range w-full"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Pop Scale — ${(options.popScale || 1.2).toFixed(2)}x`}>
              <input type="range" min={1.2} max={1.5} step={0.05} value={options.popScale || 1.2} onChange={(e) => update({ popScale: parseFloat(e.target.value) })} className="pop-range w-full" />
            </Field>
            <Field label={`Shadow — ${Math.round((options.shadowIntensity ?? 1) * 100)}%`}>
              <input type="range" min={0} max={2} step={0.1} value={options.shadowIntensity ?? 1} onChange={(e) => update({ shadowIntensity: parseFloat(e.target.value) })} className="pop-range w-full" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Box BG Color">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <input type="color" value={options.bgColor || '#00C853'} onChange={(e) => update({ bgColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
                <span className="text-[10px] font-mono text-white/70">{options.bgColor || '#00C853'}</span>
              </div>
            </Field>
            <Field label={`Box Radius — ${options.radius ?? 16}`}>
              <input type="range" min={0} max={40} step={2} value={options.radius ?? 16} onChange={(e) => update({ radius: parseInt(e.target.value) })} className="pop-range w-full" />
            </Field>
          </div>

          <button
            onClick={() => update({ uppercase: !options.uppercase })}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 transition hover:border-white/20"
          >
            <span className="text-sm font-medium text-white/80">UPPERCASE</span>
            <span
              className={`relative h-6 w-11 rounded-full transition ${options.uppercase ? 'bg-[#00FF62]' : 'bg-white/15'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${options.uppercase ? 'left-[22px]' : 'left-0.5'}`}
              />
            </span>
          </button>
        </div>
      </section>

      {/* Effects */}
      <section>
        <Label>Effects</Label>
        <div className="space-y-2.5">
          <ToggleRow label="Top progress bar" on={options.showProgressbar} onClick={() => update({ showProgressbar: !options.showProgressbar })} />
          <ToggleRow label="Auto-highlight key words" on={options.autoHighlight} onClick={() => update({ autoHighlight: !options.autoHighlight })} />
          {options.autoHighlight && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <input type="color" value={options.highlightColor} onChange={(e) => update({ highlightColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
              <span className="text-xs font-mono text-white/70">Highlight {options.highlightColor}</span>
            </div>
          )}
          <ToggleRow label="Emoji Pop 🔥" on={options.emojiPop} onClick={() => update({ emojiPop: !options.emojiPop })} />
          <ToggleRow label="Auto zoom on key words" on={options.autoZoom} onClick={() => update({ autoZoom: !options.autoZoom })} />
          <ToggleRow label="Pop sound effects" on={options.soundOn} onClick={() => update({ soundOn: !options.soundOn })} />
          {options.soundOn && (
            <Field label={`Volume — ${Math.round((options.soundVolume ?? 0.5) * 100)}%`}>
              <input type="range" min={0} max={1} step={0.05} value={options.soundVolume ?? 0.5} onChange={(e) => update({ soundVolume: parseFloat(e.target.value) })} className="pop-range w-full" />
            </Field>
          )}
        </div>
      </section>

      {/* Hook & CTA */}
      <section>
        <Label>Hook & CTA Engine</Label>
        <div className="space-y-2.5">
          <ToggleRow label="Make Hook 10x Stronger" on={options.hookBoost} onClick={() => update({ hookBoost: !options.hookBoost })} />
          <ToggleRow label="Auto money/negative styles" on={options.autoKeywordStyles} onClick={() => update({ autoKeywordStyles: !options.autoKeywordStyles })} />
          <ToggleRow label="Auto CTA at end" on={options.ctaEnabled} onClick={() => update({ ctaEnabled: !options.ctaEnabled })} />
          {options.ctaEnabled && (
            <input
              type="text"
              value={options.ctaText || ''}
              onChange={(e) => update({ ctaText: e.target.value })}
              placeholder="Follow for Part 2"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00FF62]/60"
            />
          )}
        </div>
      </section>

      {/* AI Voiceover */}
      <section>
        <Label icon={<Sparkles className="h-4 w-4" />}>AI Voiceover</Label>
        <VoiceoverPanel voiceover={voiceover} setVoiceover={setVoiceover} onGenerate={onGenerateVoiceover} />
      </section>

      <BrandKit options={options} update={update} />
      <MusicPanel music={music} setMusic={setMusic} />

      {/* Wealth tools */}
      <section>
        <Label>Wealth Tools</Label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onGenerateThumbnail} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:border-[#00FF62]/50 hover:text-white">🖼️ Thumbnail</button>
          <button onClick={onGenerateTitles} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:border-[#00FF62]/50 hover:text-white">#️⃣ Titles + Tags</button>
        </div>
        <button onClick={onMultiExport} disabled={busy || multiExporting} className="mt-2 w-full rounded-xl border border-[#00FF62]/40 bg-[#00FF62]/10 px-3 py-2.5 text-xs font-bold text-[#00FF62] transition hover:bg-[#00FF62]/20 disabled:opacity-50">
          {multiExporting ? 'Exporting all platforms…' : '⬇ Export for All Platforms'}
        </button>
      </section>

      {/* Generate */}
      <button
        onClick={onGenerate}
        disabled={busy}
        className="group relative mt-auto flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#00FF62] py-4 text-base font-bold text-black shadow-[0_0_30px_-5px_rgba(0,255,98,0.6)] transition hover:shadow-[0_0_40px_0_rgba(0,255,98,0.7)] disabled:opacity-60"
      >
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Generating {exporting?.type} {Math.round((exporting?.progress || 0) * 100)}%
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5" /> Generate Video
          </>
        )}
      </button>
      </>
      )}
    </div>
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

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-white/50">{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, on, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 transition hover:border-white/20">
      <span className="text-sm font-medium text-white/80">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-[#00FF62]' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}