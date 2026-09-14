import React from 'react';
import { LogIn, LogOut, LockKeyhole, RefreshCw, X } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AccountStatus({ user, isPro, onLogin, onLogout, onOpenPaywall }) {
  if (!isSupabaseConfigured) {
    return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50">Offline mode</span>;
  }
  if (!user) {
    return (
      <button onClick={onLogin} className="flex items-center gap-2 rounded-full bg-[#00FF62] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#66ff9a]">
        <LogIn className="h-3.5 w-3.5" /> Sign in with Google
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      {isPro && <button onClick={onOpenPaywall} className="rounded-full bg-[#00FF62]/15 px-2.5 py-1 font-bold text-[#00FF62]">PRO</button>}
      <span className="max-w-[170px] truncate text-white/60">{user.email}</span>
      <button onClick={onLogout} aria-label="Log out" className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white">
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SignupGate({ onLogin }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="signup-gate-title">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-7 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00FF62] text-2xl font-black text-black">P</div>
        <h2 id="signup-gate-title" className="text-2xl font-bold">Welcome to PopWord</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Sign up with Google to start creating animated videos. Your projects and exports stay in your browser.
        </p>
        <button onClick={onLogin} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#00FF62] px-4 py-3.5 text-sm font-bold text-black transition hover:bg-[#66ff9a]">
          <LogIn className="h-4 w-4" /> Sign up with Google
        </button>
        <p className="mt-4 text-[11px] text-white/35">Authentication is required to use PopWord.</p>
      </div>
    </div>
  );
}

export default function PaywallModal({ user, downloadCount, isPro, onClose, onRefresh, onPay, refreshing = false, paying = false }) {
  if (!user || isPro) return null;
  const remaining = Math.max(0, 3 - (downloadCount || 0));
  const closeModal = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Close paywall"
          onClick={closeModal}
          onMouseDown={closeModal}
          onPointerUp={closeModal}
          className="absolute right-2 top-2 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white active:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
        <LockKeyhole className="mb-4 h-8 w-8 text-[#00FF62]" />
        <h2 id="paywall-title" className="text-xl font-bold">Unlock unlimited exports</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {remaining > 0 ? `You have ${remaining} free export${remaining === 1 ? '' : 's'} remaining.` : 'You have used your 3 free exports.'}
          {' '}Subscribe to Pro for unlimited browser-side exports.
        </p>
        <button type="button" onClick={onPay} disabled={paying} className="mt-5 block w-full cursor-pointer rounded-xl bg-[#00FF62] px-4 py-3 text-center text-sm font-bold text-black transition hover:bg-[#66ff9a] disabled:cursor-wait disabled:opacity-60">
          {paying ? 'Opening secure checkout…' : 'Pay now — ₦3,000/month'}
        </button>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-wait disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Checking payment status…' : 'I have paid — check my status'}
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">Secure Paystack checkout opens here. Pro activates after verified payment status is received.</p>
      </div>
    </div>
  );
}
