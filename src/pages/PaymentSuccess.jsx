import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccess() {
  const [state, setState] = useState({ status: 'loading', message: '' });
  const paymentParams = new URLSearchParams(window.location.search);
  const reference = paymentParams.get('reference') || paymentParams.get('trxref');

  const verifyPayment = async () => {
    if (!reference || !supabase) {
      setState({ status: 'error', message: 'Payment reference or account session is missing.' });
      return;
    }
    setState({ status: 'loading', message: 'Verifying your payment securely...' });
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;
    if (!session?.access_token || !email) {
      setState({ status: 'error', message: 'Please sign in with the email used for payment, then try again.' });
      return;
    }
    const query = new URLSearchParams({ email, reference });
    const response = await fetch(`/api/verify-popword?${query.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json();
    if (response.ok && result.pro === true) {
      setState({ status: 'success', message: 'Your PopWord Pro plan is active for 30 days.' });
      window.setTimeout(() => {
        window.location.assign('/');
      }, 1800);
    } else {
      setState({ status: 'error', message: result.error || 'Payment is not verified yet.' });
    }
  };

  useEffect(() => {
    verifyPayment();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-5 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-8 text-center shadow-2xl">
        {state.status === 'loading' && <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-[#00FF62]" />}
        {state.status === 'success' && <CheckCircle2 className="mx-auto h-12 w-12 text-[#00FF62]" />}
        {state.status === 'error' && <XCircle className="mx-auto h-12 w-12 text-red-400" />}
        <h1 className="mt-5 text-2xl font-bold">{state.status === 'success' ? 'Pro Activated' : state.status === 'loading' ? 'Verifying payment' : 'Payment not verified yet'}</h1>
        <p className="mt-3 text-sm text-white/60">{state.message}</p>
        {state.status === 'error' && <button type="button" onClick={verifyPayment} className="mt-6 rounded-xl bg-[#00FF62] px-5 py-3 font-bold text-black">Retry verification</button>}
        <Link to="/" className="mt-6 block text-sm text-white/50 hover:text-white">Return to PopWord</Link>
      </section>
    </main>
  );
}
