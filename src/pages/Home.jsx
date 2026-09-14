import React, { useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import ControlPanel from '@/components/popgen/ControlPanel';
import PreviewPanel from '@/components/popgen/PreviewPanel';
import { recordVideo, exportGif, copyVideoToClipboard, downloadBlob } from '@/components/popgen/exporter';
import { translateToPidgin } from '@/components/popgen/data/pidginDict';
import { generateTitlesAndHashtags } from '@/components/popgen/data/titleHashtag';
import ViralScore from '@/components/popgen/ViralScore';
import PaystackModal from '@/components/popgen/PaystackModal';
import TitleHashtags from '@/components/popgen/TitleHashtags';
import PopRenderer from '@/components/popgen/PopRenderer';

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
    soundOn: false,
    soundVolume: 0.5,
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

  const [aiBusy, setAiBusy] = useState(null);
  const [voiceover, setVoiceover] = useState({ enabled: false, url: null, voice: 'river', loading: false });
  const [exportCount, setExportCount] = useState(() => parseInt(localStorage.getItem('popword_exports') || '0', 10));
  const [showPaystack, setShowPaystack] = useState(false);
  const [showViralScore, setShowViralScore] = useState(false);
  const [viralScore, setViralScore] = useState(0);
  const [viralTips, setViralTips] = useState([]);
  const [batchScripts, setBatchScripts] = useState('');
  const [batchProgress, setBatchProgress] = useState(null);
  const [music, setMusic] = useState({ url: null, name: '', enabled: false, volume: 0.6, ducking: true });
  const [multiExporting, setMultiExporting] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
  const [titleData, setTitleData] = useState({ titles: [], hashtags: [] });

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

  const aiTransform = async (type) => {
    if (!options.script.trim()) {
      toast.error('Paste a script first');
      return;
    }
    setAiBusy(type);
    const prompts = {
      viral: 'Rewrite this as a punchy, high-retention viral short-form video script with a strong hook and a call to action. Keep it concise. Return ONLY the script text, no quotes, no labels.',
      emojis: 'Add relevant emojis naturally throughout this script to boost engagement. Return ONLY the script text.',
      shorten: 'Tighten and shorten this script for maximum punchiness. Return ONLY the script text.',
      expand: 'Expand this script with more vivid detail and storytelling while staying engaging. Return ONLY the script text.',
    };
    const text = options.script.trim();
    const result = type === 'shorten'
      ? text.split(/\s+/).slice(0, Math.max(1, Math.ceil(text.split(/\s+/).length * 0.65))).join(' ')
      : type === 'emojis'
        ? text.replace(/\b(amazing|great|success|money|win|love)\b/gi, '$& ✨')
        : type === 'expand'
          ? `${text} This is the moment to take action and make it count.`
          : `You need to know this: ${text}`;
    setOptions((o) => ({ ...o, script: result }));
    setAiBusy(null);
    toast.success(`${prompts[type].split(' ')[0]} transform applied offline`);
  };

  const generateVoiceover = async () => {
    const words = options.script.trim().match(/\S+/g) || [];
    if (!words.length) {
      toast.error('Paste a script first');
      return;
    }
    setVoiceover((v) => ({ ...v, loading: false }));
    toast.error('Voiceover requires an audio file in offline mode');
  };

  const pidginTranslate = () => {
    if (!options.script.trim()) { toast.error('Paste a script first'); return; }
    setOptions((o) => ({ ...o, script: translateToPidgin(o.script) }));
    toast.success('Translated to Pidgin 🇳🇬');
  };

  const FREE_LIMIT = 3;
  const canExport = () => {
    return true;
  };
  const bumpExportCount = () => {
    const n = exportCount + 1;
    setExportCount(n);
    localStorage.setItem('popword_exports', String(n));
  };

  const computeViralScore = () => {
    let score = 40;
    const tips = [];
    const words = (options.script.trim().match(/\S+/g)) || [];
    const dur = words.length * (options.wordDuration || 0.4);
    if (dur > 0 && dur <= 30) score += 15;
    else if (dur > 0 && dur <= 60) score += 8;
    else tips.push('Keep your video under 30s for max retention.');
    const hookWords = ['you', 'now', 'secret', 'free', 'money', 'how', 'why', 'never', 'always', 'stop', 'this'];
    if (words.some((w) => hookWords.includes(w.toLowerCase().replace(/[^a-z0-9]/g, '')))) score += 15;
    else tips.push('Open with a hook word (you, now, secret, free, how, why).');
    if (options.emojiPop) score += 10; else tips.push('Turn on Emoji Pop for extra engagement.');
    if (options.autoHighlight) score += 8; else tips.push('Enable Auto-highlight to make key words pop.');
    if (options.autoZoom) score += 7; else tips.push('Enable Auto-zoom for a pro camera feel.');
    if (options.showProgressbar) score += 5;
    if (['custom', 'image', 'gradient'].includes(options.background)) score += 5;
    tips.push('Payments are coming soon; exported videos include the watermark for now.');
    return { score: Math.min(100, score), tips: tips.slice(0, 4) };
  };

  const handleGenerate = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    if (!canExport()) return;
    setExporting({ type: 'MP4', progress: 0 });
    try {
      const blob = await recordVideo(ctx.r, {
        duration: ctx.dur,
        ...audioOpts(),
        onProgress: (p) => setExporting({ type: 'MP4', progress: p }),
      });
      downloadBlob(blob, 'popup-video.' + (blob.type.includes('mp4') ? 'mp4' : 'webm'));
      bumpExportCount();
      toast.success('Video ready!');
      const vs = computeViralScore();
      setViralScore(vs.score); setViralTips(vs.tips); setShowViralScore(true);
    } catch (e) {
      toast.error('Recording failed');
    }
    setExporting(null);
  };

  const handleExportVideo = handleGenerate;

  const handleExportGif = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    if (!canExport()) return;
    setExporting({ type: 'GIF', progress: 0 });
    try {
      const blob = await exportGif(ctx.r, {
        duration: ctx.dur,
        onProgress: (p) => setExporting({ type: 'GIF', progress: p }),
      });
      downloadBlob(blob, 'popup-captions.gif');
      bumpExportCount();
      toast.success('GIF ready!');
    } catch (e) {
      toast.error('GIF export failed');
    }
    setExporting(null);
  };

  const handleCopy = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    if (!canExport()) return;
    setExporting({ type: 'Copy', progress: 0 });
    try {
      const copied = await copyVideoToClipboard(ctx.r, {
        duration: ctx.dur,
        ...audioOpts(),
        onProgress: (p) => setExporting({ type: 'Copy', progress: p }),
      });
      bumpExportCount();
      toast.success(copied ? 'Copied to clipboard!' : 'Saved (clipboard unsupported)');
    } catch (e) {
      toast.error('Copy failed');
    }
    setExporting(null);
  };

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
          ...audioOpts(),
          onProgress: () => {},
        });
        downloadBlob(blob, `popword-${i + 1}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
        bumpExportCount();
      } catch (e) {
        toast.error(`Video ${i + 1} failed`);
      }
    }
    setBatchProgress(null);
    toast.success(`Done — ${scripts.length} videos rendered`);
  };

  const audioOpts = () => ({
    audioUrl: voiceover.enabled ? voiceover.url : null,
    musicUrl: music.enabled ? music.url : null,
    musicVolume: music.volume ?? 0.6,
    duck: music.ducking,
  });

  const generateThumbnail = async () => {
    const r = rendererRef.current;
    if (!r || !r.getWords().length) { toast.error('Paste a script first'); return; }
    const off = document.createElement('canvas');
    const thumb = new PopRenderer(off, { ...options, aspect: '16:9', showProgressbar: false, watermark: false });
    thumb.setCustomMedia(options.customMedia || null);
    thumb.renderFrameAt(0);
    await new Promise((res) => setTimeout(res, 150));
    thumb.renderFrameAt(0);
    try {
      off.toBlob((blob) => {
        if (blob) downloadBlob(blob, 'popword-thumbnail.png');
        else toast.error('Thumbnail failed — try a non-image background');
      }, 'image/png');
      toast.success('Thumbnail downloaded');
    } catch (e) {
      toast.error('Thumbnail failed — try a non-image background');
    }
  };

  const generateTitles = () => {
    if (!options.script.trim()) { toast.error('Paste a script first'); return; }
    setTitleData(generateTitlesAndHashtags(options.script));
    setShowTitles(true);
  };

  const handleMultiExport = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    if (!canExport()) return;
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
          const blob = await recordVideo(r, { duration: dur, ...audioOpts(), onProgress: () => {} });
          downloadBlob(blob, `popword-${a.replace(':', 'x')}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
          completed.push(a);
        } catch (e) {
          toast.error(`${a} export failed`);
        }
      }
    } finally {
      setOptions((o) => ({ ...o, aspect: original }));
    }
    bumpExportCount();
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
              onAITransform={aiTransform}
              aiBusy={aiBusy}
              voiceover={voiceover}
              setVoiceover={setVoiceover}
              onGenerateVoiceover={generateVoiceover}
              onApplyPreset={applyPreset}
              onPidgin={pidginTranslate}
              batchScripts={batchScripts}
              setBatchScripts={setBatchScripts}
              onGenerateBatch={generateBatch}
              batchProgress={batchProgress}
              music={music}
              setMusic={setMusic}
              onGenerateThumbnail={generateThumbnail}
              onGenerateTitles={generateTitles}
              onMultiExport={handleMultiExport}
              multiExporting={multiExporting}
            />
          </div>
          {/* Preview panel */}
          <div className="order-1 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl lg:order-2">
            <PreviewPanel
              options={options}
              voiceover={voiceover}
              music={music}
              onReady={(r) => (rendererRef.current = r)}
              onExportVideo={handleExportVideo}
              onExportGif={handleExportGif}
              onCopy={handleCopy}
              exporting={exporting}
            />
          </div>
        </div>
      </main>

      {showTitles && (
        <TitleHashtags titles={titleData.titles} hashtags={titleData.hashtags} onClose={() => setShowTitles(false)} />
      )}
      {showViralScore && (
        <ViralScore score={viralScore} tips={viralTips} onClose={() => setShowViralScore(false)} />
      )}
      {showPaystack && (
        <PaystackModal
          used={Math.min(FREE_LIMIT, exportCount)}
          onClose={() => setShowPaystack(false)}
        />
      )}
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