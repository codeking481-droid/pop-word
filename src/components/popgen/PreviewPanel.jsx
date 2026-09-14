import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Film, Clipboard, Loader2 } from 'lucide-react';
import PopRenderer from './PopRenderer';
import { popSound, cashSound, whooshSound, negSound } from './soundEngine';

const SPEEDS = [1, 1.5, 2];

function fmt(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function PreviewPanel({ options, voiceover, music, onReady, onExportVideo, onExportGif, onCopy, exporting }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const barRef = useRef(null);
  const timeRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const prevTRef = useRef(0);

  useEffect(() => {
    const r = new PopRenderer(canvasRef.current, {
      ...options,
      onTimeUpdate: (t, d) => {
        if (barRef.current) barRef.current.style.width = `${d ? (t / d) * 100 : 0}%`;
        if (timeRef.current) timeRef.current.textContent = `${fmt(t)} / ${fmt(d)}`;
        if (d !== duration) setDuration(d);
        if (prevTRef.current && t < prevTRef.current - 0.5) {
          if (audioRef.current) audioRef.current.currentTime = 0;
          if (musicRef.current) musicRef.current.currentTime = 0;
        }
        prevTRef.current = t;
      },
    });
    rendererRef.current = r;
    onReady && onReady(r);
    r.play();
    return () => r.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.setOptions(options);
  }, [options]);

  useEffect(() => {
    rendererRef.current?.setCustomMedia(options.customMedia || null);
  }, [options.customMedia]);

  useEffect(() => {
    if (voiceover?.url) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = voiceover.url;
      audioRef.current.load();
    }
  }, [voiceover?.url]);

  useEffect(() => {
    const a = audioRef.current;
    const r = rendererRef.current;
    if (!a) return;
    if (voiceover?.enabled && playing && r?.playing) {
      a.currentTime = r.currentTime;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceover?.enabled, playing]);

  useEffect(() => {
    if (music?.url) {
      if (!musicRef.current) musicRef.current = new Audio();
      musicRef.current.src = music.url;
      musicRef.current.loop = true;
      musicRef.current.load();
    } else if (musicRef.current) {
      musicRef.current.pause();
    }
  }, [music?.url]);

  useEffect(() => {
    const m = musicRef.current;
    const r = rendererRef.current;
    if (!m) return;
    const duck = music?.ducking && voiceover?.enabled && playing && r?.playing;
    m.volume = duck ? (music.volume ?? 0.6) * 0.2 : (music.volume ?? 0.6);
    if (music?.enabled && playing && r?.playing) {
      m.currentTime = r.currentTime;
      m.play().catch(() => {});
    } else {
      m.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music?.enabled, music?.volume, music?.ducking, voiceover?.enabled, playing]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.setOptions({
      onPop: (word, info) => {
        if (!options.soundOn || exporting) return;
        const v = options.soundVolume ?? 0.5;
        if (info?.hook) whooshSound(v);
        else if (info?.money) cashSound(v);
        else if (info?.negative) negSound(v);
        else popSound(v);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.soundOn, options.soundVolume, exporting]);

  const togglePlay = () => {
    const r = rendererRef.current;
    if (!r) return;
    r.toggle();
    setPlaying(r.playing);
    const a = audioRef.current;
    if (a && voiceover?.enabled) {
      if (r.playing) { a.currentTime = r.currentTime; a.play().catch(() => {}); } else a.pause();
    }
    const m = musicRef.current;
    if (m && music?.enabled) {
      if (r.playing) { m.currentTime = r.currentTime; m.play().catch(() => {}); } else m.pause();
    }
  };

  const changeSpeed = (s) => {
    rendererRef.current?.setSpeed(s);
    setSpeed(s);
  };

  const seekFromEvent = (e) => {
    const r = rendererRef.current;
    if (!r || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const t = frac * duration;
    r.seek(t);
    if (audioRef.current) audioRef.current.currentTime = t;
    if (musicRef.current) musicRef.current.currentTime = t;
  };

  const busyType = exporting?.type;
  const isBusy = (t) => exporting && busyType === t;

  const aspect = options.aspect || '9:16';
  const frameWidth =
    aspect === '16:9'
      ? 'min(440px, 92vw)'
      : aspect === '1:1'
      ? 'min(330px, 82vw)'
      : aspect === '4:5'
      ? 'min(320px, 80vw)'
      : 'min(300px, 78vw)';
  const aspectRatio =
    aspect === '16:9' ? '16 / 9' : aspect === '1:1' ? '1 / 1' : aspect === '4:5' ? '4 / 5' : '9 / 16';
  const showNotch = aspect === '9:16';

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto p-5 lg:p-6">
      {/* Device frame */}
      <div className="relative mx-auto" style={{ width: frameWidth }}>
        <div className="relative rounded-[2.2rem] border-[10px] border-[#1c1c1c] bg-black shadow-[0_0_60px_-10px_rgba(0,255,98,0.25),0_25px_50px_-12px_rgba(0,0,0,0.8)]">
          {showNotch && (
            <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#1c1c1c]" />
          )}
          <div
            className="relative w-full overflow-hidden rounded-[1.4rem] bg-black"
            style={{ aspectRatio }}
          >
            <canvas ref={canvasRef} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-[420px] space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00FF62] text-black transition hover:scale-105"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
          </button>
          <div className="flex gap-1 rounded-full border border-white/10 bg-black/40 p-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  speed === s ? 'bg-[#00FF62] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <div ref={timeRef} className="ml-auto font-mono text-xs text-white/50">
            0:00 / 0:00
          </div>
        </div>

        {/* Progress */}
        <div
          onClick={seekFromEvent}
          className="group relative h-2 w-full cursor-pointer rounded-full bg-white/10"
        >
          <div
            ref={barRef}
            className="absolute left-0 top-0 h-full rounded-full bg-[#00FF62] transition-[width] duration-100"
            style={{ width: '0%' }}
          />
        </div>

        {/* Export buttons */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <ExportBtn onClick={onExportVideo} disabled={!!exporting} loading={isBusy('MP4')} icon={<Download className="h-4 w-4" />} label="MP4" />
          <ExportBtn onClick={onExportGif} disabled={!!exporting} loading={isBusy('GIF')} icon={<Film className="h-4 w-4" />} label="GIF" />
          <ExportBtn onClick={onCopy} disabled={!!exporting} loading={isBusy('Copy')} icon={<Clipboard className="h-4 w-4" />} label="Copy" />
        </div>
      </div>
    </div>
  );
}

function ExportBtn({ onClick, disabled, loading, icon, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/80 transition hover:border-[#00FF62]/50 hover:bg-[#00FF62]/10 hover:text-white disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}