import React from 'react';
import { Crown, X, Lock } from 'lucide-react';

export default function PaystackModal({ onClose, used }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl border border-[#00FF62]/30 bg-[#121212] p-6 text-center shadow-[0_0_60px_-10px_rgba(0,255,98,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00FF62] text-black">
            <Crown className="h-6 w-6" />
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-black text-white">Unlock Unlimited</h2>
        <p className="mt-1.5 text-sm text-white/50">
          You've used {used} of your 3 free exports. Remove the watermark and export as many videos as you want.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black text-[#00FF62]">$1</span>
            <span className="text-sm text-white/40">one-time</span>
          </div>
          <div className="mt-1 text-xs text-white/40">PopWord Offline Suite · forever</div>
        </div>

        <button
          disabled
          className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 text-base font-bold text-white/40"
        >
          <Lock className="h-4 w-4" /> Pay $1 with Paystack
        </button>
        <p className="mt-2 text-[11px] text-white/30">Payments are being configured. Exports remain available with the watermark.</p>

        <button onClick={onClose} className="mt-3 text-xs text-white/40 hover:text-white">
          Maybe later
        </button>
      </div>
    </div>
  );
}