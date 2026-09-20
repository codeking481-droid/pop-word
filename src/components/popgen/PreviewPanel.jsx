import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Loader2 } from 'lucide-react';
import PopRenderer from './PopRenderer';

const SPEEDS = [1, 1.5, 2];

function fmt(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function PreviewPanel({ options, onReady, onExportVideo, exporting, onPositionChange }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const barRef = useRef(null);
  const timeRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);
  const dragRef = useRef(null);

  useEffect(() => {
    const r = new PopRenderer(canvasRef.current, {
      ...options,
      onTimeUpdate: (t, d) => {
        if (barRef.current) barRef.current.style.width = `${d ? Math.min(100, Math.max(0, (t / d) * 100)) : 0}%`;
        if (timeRef.current) timeRef.current.textContent = `${fmt(t)} / ${fmt(d)}`;
        if (d !== durationRef.current) {
          durationRef.current = d;
          setDuration(d);
        }
      },
    });
    rendererRef.current = r;
    onReady && onReady(r);
    r.play();
    return () => {
      r.destroy();
      if (rendererRef.current === r) rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // renderer lifecycle is intentionally tied to the canvas

  useEffect(() => {
    const handleVisibility = () => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      if (document.visibilityState === 'hidden') renderer.pause();
      else if (playing) renderer.play();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [playing]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.setOptions(options);
  }, [options]);

  useEffect(() => {
    rendererRef.current?.setCustomMedia(options.customMedia || null);
  }, [options.customMedia]);

  const togglePlay = () => {
    const r = rendererRef.current;
    if (!r) return;
    r.toggle();
    setPlaying(r.playing);
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
  };

  const startPositionDrag = (e) => {
    if (e.button !== 0 || !onPositionChange) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events and some mobile browsers do not expose an active pointer.
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: Number(options.textOffsetX) || 0,
      offsetY: Number(options.textOffsetY) || 0,
    };
  };

  const movePositionDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || !onPositionChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nextX = Math.max(-40, Math.min(40, drag.offsetX + ((e.clientX - drag.startX) / rect.width) * 100));
    const nextY = Math.max(-40, Math.min(40, drag.offsetY + ((e.clientY - drag.startY) / rect.height) * 100));
    onPositionChange(nextX, nextY);
  };

  const stopPositionDrag = (e) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // The pointer may already have been released by the browser.
      }
    }
    dragRef.current = null;
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
    <div className="flex h-full min-w-0 flex-col items-center gap-4 overflow-y-auto p-3 sm:p-5 lg:p-6">
      {/* Device frame */}
      <div className="relative mx-auto w-full max-w-full" style={{ width: frameWidth }}>
        <div className="relative rounded-[2.2rem] border-[10px] border-[#1c1c1c] bg-black shadow-[0_0_60px_-10px_rgba(0,255,98,0.25),0_25px_50px_-12px_rgba(0,0,0,0.8)]">
          {showNotch && (
            <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#1c1c1c]" />
          )}
          <div
            className="relative w-full overflow-hidden rounded-[1.4rem] bg-black"
            style={{ aspectRatio }}
            onPointerDown={startPositionDrag}
            onPointerMove={movePositionDrag}
            onPointerUp={stopPositionDrag}
            onPointerCancel={stopPositionDrag}
            title="Drag the popup text to position it"
          >
            <canvas ref={canvasRef} className="h-full w-full" />
            {options.showSafeZones && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-[12%] border-t border-dashed border-yellow-300/80" />
                <div className="pointer-events-none absolute inset-x-0 bottom-[24%] border-t border-dashed border-yellow-300/80" />
                <div className="pointer-events-none absolute inset-x-[8%] top-[12%] bottom-[24%] rounded border border-yellow-300/30" />
                <span className="pointer-events-none absolute left-2 top-[12%] -translate-y-full rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-200">Keep captions inside</span>
                <span className="pointer-events-none absolute bottom-[24%] right-2 translate-y-full rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-200">Avoid app controls</span>
              </>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-[420px] space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00FF62] text-black transition hover:scale-105"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
          </button>
          <div className="flex gap-0.5 rounded-full border border-white/10 bg-black/40 p-1 sm:gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:py-1 ${
                  speed === s ? 'bg-[#00FF62] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <div ref={timeRef} className="ml-auto font-mono text-[11px] text-white/50">
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
        <div className="pt-1">
          <ExportBtn onClick={onExportVideo} disabled={!!exporting} loading={isBusy('MP4')} icon={<Download className="h-4 w-4" />} label="Video" />
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
      className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/80 transition hover:border-[#00FF62]/50 hover:bg-[#00FF62]/10 hover:text-white disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}