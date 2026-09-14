import React from 'react';
import { Mic, Loader2 } from 'lucide-react';

const VOICES = [
  { id: 'river', label: 'River · calm' },
  { id: 'honey', label: 'Honey · warm' },
  { id: 'sunny', label: 'Sunny · upbeat' },
  { id: 'storm', label: 'Storm · bold' },
  { id: 'spark', label: 'Spark · energetic' },
];

export default function VoiceoverPanel({ voiceover, setVoiceover, onGenerate }) {
  const update = (patch) => setVoiceover({ ...voiceover, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={voiceover.voice}
          onChange={(e) => update({ voice: e.target.value })}
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00FF62]/60"
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id} className="bg-[#121212]">
              {v.label}
            </option>
          ))}
        </select>
        <button
          onClick={onGenerate}
          disabled={voiceover.loading}
          className="flex items-center gap-1.5 rounded-xl bg-[#00FF62] px-3.5 py-2.5 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {voiceover.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
          {voiceover.url ? 'Regen' : 'Generate'}
        </button>
      </div>
      {voiceover.url && (
        <button
          onClick={() => update({ enabled: !voiceover.enabled })}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${
            voiceover.enabled ? 'border-[#00FF62] bg-[#00FF62]/10' : 'border-white/10 bg-black/30'
          }`}
        >
          <span className="text-sm font-medium text-white/80">Voiceover in video</span>
          <span className={`relative h-6 w-11 rounded-full transition ${voiceover.enabled ? 'bg-[#00FF62]' : 'bg-white/15'}`}>
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                voiceover.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      )}
    </div>
  );
}