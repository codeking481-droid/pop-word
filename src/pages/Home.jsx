import React, { useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import ControlPanel from '@/components/popgen/ControlPanel';
import PreviewPanel from '@/components/popgen/PreviewPanel';
import { recordVideo, downloadBlob } from '@/components/popgen/exporter';

export default function Home() {
  const rendererRef = useRef(null);
  const [exporting, setExporting] = useState(null);

  const [options, setOptions] = useState({
    script: '',
    background: 'stars',
    textColor: '#00FF62',
    font: 'Bold',
    animation: 'Pop',
    wordDuration: 0.4,
    uppercase: true,
    aspect: '9:16',
    customMedia: null,
    mediaLibrary: [],
    showProgressbar: true,
    autoHighlight: false,
    highlightColor: '#FFD700',
    emojiPop: false,
    autoZoom: false,
    popScale: 1.2,
    shadowIntensity: 1,
    bgColor: '#00C853',
    radius: 16,
    gradientColors: ['#1a0b3e', '#0a0118'],
    bgImage: null,
    watermark: true,
    mode: 'pop',
    hookBoost: false,
    ctaEnabled: false,
    ctaText: 'Follow for Part 2',
    autoKeywordStyles: false,
    brandEnabled: false,
    brandColor: '#00FF62',
    brandLogo: null,
  });

  const [batchScripts, setBatchScripts] = useState('');
  const [batchProgress, setBatchProgress] = useState(null);
  const [multiExporting, setMultiExporting] = useState(false);

  const ensureScript = () => {
    const r = rendererRef.current;
    if (!r) return null;
    const dur = r.getDuration();
    if (dur <= 0) {
      toast.error('Paste a script first');
      return null;
    }
    return { r, dur };
  };

  const addMedia = (files) => {
    const items = files.map((file) => {
      const isVideo = file.type.startsWith('video');
      const url = URL.createObjectURL(file);
      let element;
      if (isVideo) {
        element = document.createElement('video');
        element.src = url;
        element.muted = true;
        element.loop = true;
        element.playsInline = true;
        element.preload = 'auto';
        element.load();
      } else {
        element = new Image();
        element.src = url;
      }
      return {
        id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        type: isVideo ? 'video' : 'image',
        element,
        url,
        name: file.name,
      };
    });
    setOptions((o) => ({ ...o, mediaLibrary: [...(o.mediaLibrary || []), ...items] }));
  };

  const selectMedia = (item) => {
    setOptions((o) => ({ ...o, background: 'custom', customMedia: item.element }));
  };

  const removeMedia = (id) => {
    setOptions((o) => {
      const lib = (o.mediaLibrary || []).filter((m) => m.id !== id);
      const removed = (o.mediaLibrary || []).find((m) => m.id === id);
      const patch = { mediaLibrary: lib };
      if (removed && o.customMedia === removed.element) {
        patch.background = 'stars';
        patch.customMedia = null;
      }
      return { ...o, ...patch };
    });
  };

  const applyPreset = (patch) => setOptions((o) => ({ ...o, ...patch }));

  const handleGenerate = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    setExporting({ type: 'MP4', progress: 0 });
    try {
      const blob = await recordVideo(ctx.r, {
        duration: ctx.dur,
        onProgress: (p) => setExporting({ type: 'MP4', progress: p }),
      });
      downloadBlob(blob, 'popup-video.' + (blob.type.includes('mp4') ? 'mp4' : 'webm'));
      toast.success('Video ready!');
    } catch (e) {
      toast.error('Recording failed');
    }
    setExporting(null);
  };

  const handleExportVideo = handleGenerate;

  const generateBatch = async () => {
    const scripts = batchScripts.split(/^---\s*$|\n---\s*$|\n---\n/m).map((s) => s.trim()).filter(Boolean);
    if (!scripts.length) { toast.error('Add at least one script'); return; }
    setBatchProgress({ current: 0, total: scripts.length });
    for (let i = 0; i < scripts.length; i++) {
      setBatchProgress({ current: i, total: scripts.length });
      setOptions((o) => ({ ...o, script: scripts[i] }));
      await new Promise((r) => setTimeout(r, 150));
      const r = rendererRef.current;
      const dur = r.getDuration();
      if (dur <= 0) continue;
      try {
        const blob = await recordVideo(r, {
          duration: dur,
          onProgress: () => {},
        });
        downloadBlob(blob, `popword-${i + 1}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
      } catch (e) {
        toast.error(`Video ${i + 1} failed`);
      }
    }
    setBatchProgress(null);
    toast.success(`Done — ${scripts.length} videos rendered`);
  };

  const handleMultiExport = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    setMultiExporting(true);
    const aspects = ['9:16', '1:1', '16:9'];
    const original = options.aspect;
    const completed = [];
    try {
      for (const a of aspects) {
        setOptions((o) => ({ ...o, aspect: a }));
        await new Promise((res) => setTimeout(res, 180));
        const r = rendererRef.current;
        const dur = r.getDuration();
        if (dur <= 0) continue;
        try {
          const blob = await recordVideo(r, { duration: dur, onProgress: () => {} });
          downloadBlob(blob, `popword-${a.replace(':', 'x')}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
          completed.push(a);
        } catch (e) {
          toast.error(`${a} export failed`);
        }
      }
    } finally {
      setOptions((o) => ({ ...o, aspect: original }));
    }
    setMultiExporting(false);
    toast.success(`Exported ${completed.length} of ${aspects.length} formats`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FF62] text-black shadow-[0_0_20px_-4px_rgba(0,255,98,0.7)]">
              <Zap className="h-5 w-5" fill="black" />
            </div>
            <div>
              <div className="text-base font-bold leading-none">PopUp</div>
              <div className="text-[11px] text-white/40">Viral Word Pop Generator</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPaystack(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:text-white"
            >
              <span className="h-2 w-2 rounded-full bg-white/50" />
              Pro payments coming soon
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-[1500px] px-5 py-5 lg:px-8 lg:py-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:gap-6">
          {/* Control panel */}
          <div className="order-2 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl lg:order-1">
            <ControlPanel
              options={options}
              setOptions={setOptions}
              onGenerate={handleGenerate}
              exporting={exporting}
              onAddMedia={addMedia}
              onSelectMedia={selectMedia}
              onRemoveMedia={removeMedia}
              onApplyPreset={applyPreset}
              batchScripts={batchScripts}
              setBatchScripts={setBatchScripts}
              onGenerateBatch={generateBatch}
              batchProgress={batchProgress}
              onMultiExport={handleMultiExport}
              multiExporting={multiExporting}
            />
          </div>
          {/* Preview panel */}
          <div className="order-1 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl lg:order-2">
            <PreviewPanel
              options={options}
              onReady={(r) => (rendererRef.current = r)}
              onExportVideo={handleExportVideo}
              exporting={exporting}
            />
          </div>
        </div>
      </main>

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#161616',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: { iconTheme: { primary: '#00FF62', secondary: '#0A0A0A' } },
        }}
      />
    </div>
  );
}