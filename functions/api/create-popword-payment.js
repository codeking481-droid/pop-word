const TEST_PLAN = 'PLN_hjzusad1jus87lw';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  const secret = env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || !supabaseUrl || !anonKey) return json({ error: 'Payment is not configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const email = body?.email?.trim().toLowerCase();
  if (!email) return json({ error: 'Email is required' }, 400);
  if (!accessToken) return json({ error: 'Authentication is required' }, 401);

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  const authData = await authResponse.json();
  if (!authResponse.ok || authData?.email?.trim().toLowerCase() !== email) {
    return json({ error: 'Authenticated email does not match checkout email' }, 403);
  }

  const origin = new URL(request.url).origin;
  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      plan: env.PAYSTACK_PLAN_CODE || TEST_PLAN,
      callback_url: `${origin}/payment-success`,
      metadata: { product: 'PopWord Pro Monthly' },
    }),
  });
  const result = await paystackResponse.json();
  if (!paystackResponse.ok || result?.status !== true || !result?.data?.authorization_url) {
    console.error('Paystack initialization failed', result);
    return json({ error: 'Could not start secure checkout' }, 502);
  }

  return json({ authorization_url: result.data.authorization_url });
}
