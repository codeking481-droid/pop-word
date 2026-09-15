const TEST_PLAN = 'PLN_hjzusad1jus87lw';
const LIVE_PLAN = 'PLN_w7htm2j67axsrv9';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function patchSubscription(baseUrl, serviceKey, userId, email, values) {
  const url = new URL('/rest/v1/subscriptions', baseUrl);
  url.searchParams.set('user_id', `eq.${userId}`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase subscriptions update failed (${response.status}): ${details.slice(0, 240)}`);
  }
  const rows = await response.json();
  if (rows?.length) return;

  const createResponse = await fetch(new URL('/rest/v1/subscriptions', baseUrl), {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, email, ...values }),
  });
  if (!createResponse.ok) {
    const details = await createResponse.text();
    throw new Error(`Supabase subscriptions create failed (${createResponse.status}): ${details.slice(0, 240)}`);
  }
}

export async function onRequestGet({ request, env }) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const params = new URL(request.url).searchParams;
  const reference = params.get('reference')?.trim();
  const requestedEmail = params.get('email')?.trim().toLowerCase();
  if (!env.PAYSTACK_SECRET_KEY || !supabaseUrl || !serviceKey || !anonKey) return json({ error: 'Verification is not configured' }, 500);
  if (!accessToken || !reference || !requestedEmail) return json({ error: 'Authentication and payment reference are required' }, 400);

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  const authData = await authResponse.json();
  const authenticatedEmail = authData?.email?.trim().toLowerCase();
  const userId = authData?.id;
  if (!authResponse.ok || !userId || authenticatedEmail !== requestedEmail) return json({ error: 'Authenticated email does not match payment email' }, 403);

  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const verification = await verifyResponse.json();
  const payment = verification?.data;
  if (!verifyResponse.ok || !verification?.status || payment?.status !== 'success') return json({ error: 'Paystack verification failed' }, 400);
  if (payment.customer?.email?.trim().toLowerCase() !== authenticatedEmail) return json({ error: 'Payment email does not match account email' }, 403);
  const acceptedPlans = [env.PAYSTACK_PLAN_CODE, TEST_PLAN, LIVE_PLAN].filter(Boolean);
  if (!acceptedPlans.includes(payment.plan) && ![300000, 3000].includes(payment.amount)) return json({ error: 'Payment is not for PopWord Pro' }, 400);

  try {
    await patchSubscription(supabaseUrl, serviceKey, userId, authenticatedEmail, {
      pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      download_count: 0,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error.message }, 500);
  }
  return json({ pro: true });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  return onRequestGet(context);
}
