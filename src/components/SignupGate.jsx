import React from 'react';
import { LogIn } from 'lucide-react';

export default function SignupGate({ onLogin, loading = false, error = '' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="signup-title">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-7 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00FF62] text-2xl font-black text-black">P</div>
        <h2 id="signup-title" className="text-2xl font-bold">Welcome to PopWord</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">Sign up with Google to start creating animated videos. Your projects and exports stay in your browser.</p>
        <button type="button" onClick={onLogin} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#00FF62] px-4 py-3.5 text-sm font-bold text-black transition hover:bg-[#66ff9a] disabled:cursor-wait disabled:opacity-60">
          <LogIn className="h-4 w-4" /> {loading ? 'Opening Google…' : 'Sign up with Google'}
        </button>
        {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
      </div>
    </div>
  );
}
