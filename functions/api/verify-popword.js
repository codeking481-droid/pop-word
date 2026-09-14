const PAYSTACK_PLANS = new Set([
  'PLN_hjzusad1jus87lw',
  'PLN_w7htm2j67axsrv9',
]);
const PAYSTACK_AMOUNTS = new Set([300000, 3000]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function patchTable(baseUrl, serviceKey, table, filter, values) {
  const url = new URL(`/rest/v1/${table}`, baseUrl);
  for (const [key, value] of Object.entries(filter)) url.searchParams.set(key, `eq.${value}`);
  const result = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(values),
  });
  if (!result.ok && result.status !== 404) {
    throw new Error(`Supabase ${table} update failed (${result.status})`);
  }
  return result.status !== 404;
}

export async function onRequestGet({ request, env }) {
  const secret = env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const params = new URL(request.url).searchParams;
  const reference = params.get('reference');
  const requestedEmail = params.get('email')?.trim().toLowerCase();

  if (!secret || !supabaseUrl || !serviceKey || !anonKey) return json({ error: 'Verification is not configured' }, 500);
  if (!accessToken || !reference || !requestedEmail) return json({ error: 'Authentication and payment reference are required' }, 400);

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  const authData = await authResponse.json();
  const authenticatedEmail = authData?.email?.trim().toLowerCase();
  if (!authResponse.ok || !authenticatedEmail || authenticatedEmail !== requestedEmail) {
    return json({ error: 'Authenticated email does not match payment email' }, 403);
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!verifyResponse.ok) return json({ error: 'Paystack verification failed' }, 502);

  const verification = await verifyResponse.json();
  const transaction = verification?.data;
  const transactionEmail = transaction?.customer?.email?.trim().toLowerCase();
  const planCode = transaction?.plan?.plan_code || transaction?.plan;
  const validPlan = PAYSTACK_PLANS.has(planCode);
  const validAmount = PAYSTACK_AMOUNTS.has(transaction?.amount);
  if (
    verification?.status !== true ||
    transaction?.status !== 'success' ||
    transactionEmail !== authenticatedEmail ||
    (!validPlan && !validAmount)
  ) {
    return json({ error: 'Payment could not be verified' }, 400);
  }

  const values = {
    pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pro',
    download_count: 0,
    paystack_ref: reference,
    activated_at: new Date().toISOString(),
  };
  const profileValues = {
    is_pro: true,
    pro_plan: 'PopWord Pro Monthly',
    pro_since: values.activated_at,
  };

  try {
    const profileUpdated = await patchTable(supabaseUrl, serviceKey, 'profiles', { email: authenticatedEmail }, profileValues);
    const subscriptionUpdated = await patchTable(supabaseUrl, serviceKey, 'subscriptions', { email: authenticatedEmail }, values);
    await patchTable(supabaseUrl, serviceKey, 'users', { email: authenticatedEmail }, {
      is_pro: true,
      pro_plan: profileValues.pro_plan,
      pro_since: profileValues.pro_since,
    });
    if (!profileUpdated && !subscriptionUpdated) return json({ error: 'Pro account record not found' }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: 'Pro activation failed' }, 500);
  }

  return json({ pro: true });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  return onRequestGet(context);
}
