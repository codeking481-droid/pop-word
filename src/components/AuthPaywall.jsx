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

export default function PaywallModal({ user, downloadCount, isPro, onClose, onRefresh }) {
  if (!user || isPro) return null;
  const remaining = Math.max(0, 3 - (downloadCount || 0));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        <LockKeyhole className="mb-4 h-8 w-8 text-[#00FF62]" />
        <h2 id="paywall-title" className="text-xl font-bold">Unlock unlimited exports</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {remaining > 0 ? `You have ${remaining} free export${remaining === 1 ? '' : 's'} remaining.` : 'You have used your 3 free exports.'}
          {' '}Subscribe to Pro for unlimited browser-side exports.
        </p>
        <a href={import.meta.env.VITE_PAYSTACK_PAGE || 'https://paystack.shop/pay/yl0xsmgy4e'} target="_blank" rel="noreferrer" className="mt-5 block rounded-xl bg-[#00FF62] px-4 py-3 text-center text-sm font-bold text-black transition hover:bg-[#66ff9a]">
          Subscribe — ₦3,000/month
        </a>
        <button onClick={onRefresh} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white">
          <RefreshCw className="h-4 w-4" /> I have paid — check my status
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">Payment activation is verified server-side. This button never grants Pro access on its own.</p>
      </div>
    </div>
  );
}
