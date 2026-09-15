import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Zap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import ControlPanel from '@/components/popgen/ControlPanel';
import PreviewPanel from '@/components/popgen/PreviewPanel';
import { recordVideo, downloadBlob } from '@/components/popgen/exporter';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import SignupGate from '@/components/SignupGate';

export default function Home() {
  const rendererRef = useRef(null);
  const ownedUrlsRef = useRef(new Set());
  const [exporting, setExporting] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const userRef = useRef(null);
  userRef.current = user;

  const loadSubscription = async (userId, email) => {
    const [{ data, error }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('subscriptions')
      .select('download_count, pro_expiry')
      .eq('user_id', userId)
      .maybeSingle(),
      supabase.from('profiles')
        .select('is_pro, pro_plan, pro_since')
        .eq('email', email)
        .maybeSingle(),
    ]);
    if (error && profileError) {
      setAuthError(`Account status unavailable: ${error.message}`);
      setSubscription({ download_count: 0 });
      return;
    }
    setSubscription({ ...(data || {}), ...(profile || {}), download_count: data?.download_count || 0 });
  };

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
    showSafeZones: false,
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

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setUser(session?.user || null);
      setAuthReady(true);
      if (session?.user) loadSubscription(session.user.id, session.user.email);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
      setAuthLoading(false);
      if (session?.user) loadSubscription(session.user.id, session.user.email);
      else {
        setSubscription(null);
      }
    });
    const refreshOnReturn = () => {
      const currentUser = userRef.current;
      if (document.visibilityState === 'visible' && currentUser) loadSubscription(currentUser.id, currentUser.email);
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  };

  const trialRemaining = Math.max(0, 3 - (subscription?.download_count || 0));
  const isPro = Boolean(
    subscription?.is_pro ||
    (subscription?.pro_expiry && new Date(subscription.pro_expiry).getTime() > Date.now()),
  );
  const handleUpgrade = async () => {
    if (!user?.email || upgradeLoading) return;
    setUpgradeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your sign-in session has expired');
      const response = await fetch('/api/create-popword-payment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });
      const result = await response.json();
      if (!response.ok || !result.authorization_url) throw new Error(result.error || 'Could not start checkout');
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast.error(error.message || 'Could not start checkout');
      setUpgradeLoading(false);
    }
  };

  const signIn = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthLoading(false);
      setAuthError(error.message);
    }
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

  const canTrialExport = () => {
    if (isPro) return true;
    const used = Number(subscription?.download_count) || 0;
    if (used >= 3) {
      toast.error('Your 3 trial exports are used. Upgrade to export more videos.');
      return false;
    }
    return true;
  };

  const recordTrialExport = async () => {
    if (isPro) return true;
    const used = Number(subscription?.download_count) || 0;
    const nextCount = used + 1;
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ download_count: nextCount })
      .eq('user_id', user.id)
      .select('download_count')
      .maybeSingle();
    if (error || !data) {
      toast.error(error?.message || 'Could not update your trial export count');
      return false;
    }
    setSubscription((current) => ({ ...current, download_count: data.download_count }));
    return true;
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
    const ctx = ensureScript();
    if (!ctx) return;
    if (!canTrialExport()) return;
    setExporting({ type: 'MP4', progress: 0 });
    try {
      const blob = await recordVideo(ctx.r, {
        duration: ctx.dur,
        onProgress: (p) => setExporting({ type: 'MP4', progress: p }),
      });
      downloadBlob(blob, 'popup-video.' + (blob.type.includes('mp4') ? 'mp4' : 'webm'));
      await recordTrialExport();
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
    try {
      for (let i = 0; i < scripts.length; i++) {
        setBatchProgress({ current: i, total: scripts.length });
        setExporting({ type: 'BATCH', progress: i / scripts.length });
        setOptions((o) => ({ ...o, script: scripts[i] }));
        renderer.setOptions({ script: scripts[i] });
        const dur = renderer.getDuration();
        if (dur <= 0 || !renderer.hasContent()) {
          setBatchProgress({ current: i + 1, total: scripts.length });
          continue;
        }
        if (!canTrialExport()) break;
        try {
          const blob = await recordVideo(renderer, {
            duration: dur,
            onProgress: () => {},
          });
          downloadBlob(blob, `popword-${i + 1}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
          await recordTrialExport();
        } catch (e) {
          toast.error(`Video ${i + 1} failed${e?.message ? `: ${e.message}` : ''}`);
        }
        setBatchProgress({ current: i + 1, total: scripts.length });
      }
      toast.success(`Done — ${scripts.length} videos rendered`);
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
    setExporting({ type: 'ALL', progress: 0 });
    try {
      for (const a of aspects) {
        setOptions((o) => ({ ...o, aspect: a }));
        const r = ctx.r;
        r.setOptions({ aspect: a });
        const dur = r.getDuration();
        if (dur <= 0 || !r.hasContent()) continue;
        if (!canTrialExport()) break;
        try {
          const blob = await recordVideo(r, { duration: dur, onProgress: () => {} });
          downloadBlob(blob, `popword-${a.replace(':', 'x')}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
          await recordTrialExport();
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
          <div className="flex items-center gap-3">
            {isSupabaseConfigured && user ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/55">
                  {isPro ? 'Pro' : `${trialRemaining} trial export${trialRemaining === 1 ? '' : 's'} left`}
                </span>
                {!isPro && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-white/50" title="Approximate USD display; checkout is charged in NGN">~$2/mo</span>
                    <button type="button" onClick={handleUpgrade} disabled={upgradeLoading} className="rounded-full bg-[#00FF62] px-2.5 py-1 text-[11px] font-bold text-black transition hover:bg-[#66ff9a] disabled:cursor-wait disabled:opacity-60">{upgradeLoading ? 'Opening...' : 'Upgrade'}</button>
                  </div>
                )}
                <span className="max-w-[180px] truncate text-xs text-white/55">{user.email}</span>
                <button type="button" onClick={handleSignOut} aria-label="Sign out" className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50">Offline mode</div>}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto min-w-0 max-w-[1500px] overflow-x-hidden px-5 py-5 lg:px-8 lg:py-6">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:gap-6">
          {/* Control panel */}
          <div className="order-2 min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl lg:order-1">
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
          <div className="order-1 min-w-0 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl lg:order-2">
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
      {isSupabaseConfigured && authReady && !user && (
        <SignupGate
          onLogin={signIn}
          loading={authLoading}
          error={authError}
        />
      )}
    </div>
  );
}