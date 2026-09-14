import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import ControlPanel from '@/components/popgen/ControlPanel';
import PreviewPanel from '@/components/popgen/PreviewPanel';
import { recordVideo, downloadBlob } from '@/components/popgen/exporter';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import PaywallModal, { AccountStatus, SignupGate } from '@/components/AuthPaywall';

export default function Home() {
  const rendererRef = useRef(null);
  const ownedUrlsRef = useRef(new Set());
  const [exporting, setExporting] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [subscription, setSubscription] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [paying, setPaying] = useState(false);

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
    template: 'pop',
    minimalCards: [],
    minimalLayout: 'scatter',
    minimalStyle: 'liquid',
    minimalNumber: 12,
    minimalAnimateNumber: true,
    minimalBullets: 'Fast setup\nNo account\nExport locally',
    flowSentence: 'Make ideas move',
    flowWaveHeight: 170,
    flowWaveSpeed: 1,
    flowWaveFrequency: 2.2,
    flowMessage: 'Keep going',
    flowArrows: true,
    hookBoost: false,
    ctaEnabled: false,
    ctaText: 'Follow for Part 2',
    autoKeywordStyles: false,
    brandEnabled: false,
    brandColor: '#00FF62',
    brandLogo: null,
  });
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [batchScripts, setBatchScripts] = useState('');
  const [batchProgress, setBatchProgress] = useState(null);
  const [multiExporting, setMultiExporting] = useState(false);

  const loadSubscription = async (currentUser) => {
    if (!supabase || !currentUser) {
      setSubscription(null);
      return;
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .select('download_count, pro_expiry')
      .eq('email', currentUser.email)
      .maybeSingle();
    if (error) {
      toast.error(`Could not load account limits: ${error.message}`);
      return;
    }
    setSubscription(data);
  };

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user || null);
      setAuthReady(true);
      if (session?.user) loadSubscription(session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
      if (session?.user) loadSubscription(session.user);
      else setSubscription(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
  };

  const isPro = Boolean(subscription?.pro_expiry && new Date(subscription.pro_expiry).getTime() > Date.now());
  const refreshSubscription = async () => {
    setRefreshingSubscription(true);
    try {
      await loadSubscription(user);
    } finally {
      setRefreshingSubscription(false);
    }
  };
  useEffect(() => {
    if (!paywallOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPaywallOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [paywallOpen]);
  const handlePay = async () => {
    if (!user) return;
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      toast.error('Paystack is not configured in Cloudflare yet.');
      return;
    }
    if (!window.PaystackPop) {
      try {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-paystack-inline]');
          if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.async = true;
          script.dataset.paystackInline = 'true';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch {
        toast.error('Could not load Paystack checkout. Check your connection and try again.');
        return;
      }
    }
    if (!window.PaystackPop) {
      toast.error('Paystack checkout is unavailable in this browser.');
      return;
    }
    setPaying(true);
    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: 300000,
      currency: 'NGN',
      ref: `popword_${user.id}_${Date.now()}`,
      metadata: { user_id: user.id },
      callback: async () => {
        setPaying(false);
        await refreshSubscription();
        toast.success('Payment received. Pro will activate after verification.');
      },
      onClose: () => setPaying(false),
    });
    handler.openIframe();
  };
  const ensureDownloadAccess = async () => {
    if (!isSupabaseConfigured) return true;
    if (!user) {
      toast.error('Sign in with Google to export');
      return false;
    }
    if (isPro) return true;
    const { data, error } = await supabase.rpc('consume_download');
    if (error) {
      toast.error(`Could not record export: ${error.message}`);
      return false;
    }
    if (!data) {
      setPaywallOpen(true);
      return false;
    }
    setSubscription((current) => ({ ...(current || {}), download_count: (current?.download_count || 0) + 1 }));
    return true;
  };

  useEffect(() => () => {
    for (const url of ownedUrlsRef.current) URL.revokeObjectURL(url);
    for (const card of optionsRef.current.minimalCards || []) {
      if (card.url) URL.revokeObjectURL(card.url);
    }
    ownedUrlsRef.current.clear();
  }, []);

  const ensureScript = () => {
    const r = rendererRef.current;
    if (!r) return null;
    const dur = r.getDuration();
    if (dur <= 0 || !r.hasContent()) {
      toast.error('Paste a script first');
      return null;
    }
    return { r, dur };
  };

  const addMedia = (files) => {
    const items = files.map((file) => {
      const isVideo = file.type.startsWith('video');
      const url = URL.createObjectURL(file);
      ownedUrlsRef.current.add(url);
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
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
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
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
        ownedUrlsRef.current.delete(removed.url);
      }
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
    if (!(await ensureDownloadAccess())) return;
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
      toast.error(e?.message || 'Recording failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportVideo = handleGenerate;

  const generateBatch = async () => {
    const scripts = batchScripts.split(/^---\s*$|\n---\s*$|\n---\n/m).map((s) => s.trim()).filter(Boolean);
    if (!scripts.length) { toast.error('Add at least one script'); return; }
    const renderer = rendererRef.current;
    if (!renderer) { toast.error('Preview is still loading'); return; }
    setBatchProgress({ current: 0, total: scripts.length });
    setExporting({ type: 'BATCH', progress: 0 });
    let stoppedByLimit = false;
    try {
      for (let i = 0; i < scripts.length; i++) {
        if (!(await ensureDownloadAccess())) {
          stoppedByLimit = true;
          break;
        }
        setBatchProgress({ current: i, total: scripts.length });
        setExporting({ type: 'BATCH', progress: i / scripts.length });
        setOptions((o) => ({ ...o, script: scripts[i] }));
        renderer.setOptions({ script: scripts[i] });
        const dur = renderer.getDuration();
        if (dur <= 0 || !renderer.hasContent()) {
          setBatchProgress({ current: i + 1, total: scripts.length });
          continue;
        }
        try {
          const blob = await recordVideo(renderer, {
            duration: dur,
            onProgress: () => {},
          });
          downloadBlob(blob, `popword-${i + 1}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
        } catch (e) {
          toast.error(`Video ${i + 1} failed${e?.message ? `: ${e.message}` : ''}`);
        }
        setBatchProgress({ current: i + 1, total: scripts.length });
      }
      toast.success(stoppedByLimit ? 'Export stopped at your account limit' : `Done — ${scripts.length} videos rendered`);
    } finally {
      setBatchProgress(null);
      setExporting(null);
    }
  };

  const handleMultiExport = async () => {
    const ctx = ensureScript();
    if (!ctx) return;
    setMultiExporting(true);
    const aspects = ['9:16', '1:1', '4:5', '16:9'];
    const original = options.aspect;
    const completed = [];
    let stoppedByLimit = false;
    setExporting({ type: 'ALL', progress: 0 });
    try {
      for (const a of aspects) {
        if (!(await ensureDownloadAccess())) {
          stoppedByLimit = true;
          break;
        }
        setOptions((o) => ({ ...o, aspect: a }));
        const r = ctx.r;
        r.setOptions({ aspect: a });
        const dur = r.getDuration();
        if (dur <= 0 || !r.hasContent()) continue;
        try {
          const blob = await recordVideo(r, { duration: dur, onProgress: () => {} });
          downloadBlob(blob, `popword-${a.replace(':', 'x')}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
          completed.push(a);
        } catch (e) {
          toast.error(`${a} export failed${e?.message ? `: ${e.message}` : ''}`);
        }
        setExporting({ type: 'ALL', progress: (completed.length + 1) / aspects.length });
      }
    } finally {
      setOptions((o) => ({ ...o, aspect: original }));
      rendererRef.current?.setOptions({ aspect: original });
      setExporting(null);
      setMultiExporting(false);
    }
    toast.success(stoppedByLimit ? `Export stopped after ${completed.length} format${completed.length === 1 ? '' : 's'}` : `Exported ${completed.length} of ${aspects.length} formats`);
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
          <div className="flex items-center gap-3">
            <AccountStatus user={user} isPro={isPro} onLogin={signIn} onLogout={signOut} onOpenPaywall={() => setPaywallOpen(true)} />
            {isSupabaseConfigured && !user && <span className="hidden text-[11px] text-white/35 sm:inline">3 free exports after sign-in</span>}
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
      <PaywallModal
        user={user}
        downloadCount={subscription?.download_count || 0}
        isPro={isPro}
        onClose={() => setPaywallOpen(false)}
        onPay={handlePay}
        paying={paying}
        refreshing={refreshingSubscription}
        onRefresh={refreshSubscription}
      />
      {isSupabaseConfigured && authReady && !user && <SignupGate onLogin={signIn} />}
    </div>
  );
}