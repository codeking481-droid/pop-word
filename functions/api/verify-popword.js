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

async function patchTable(baseUrl, serviceKey, table, filter, values, optional = false) {
  const url = new URL(`/rest/v1/${table}`, baseUrl);
  for (const [key, value] of Object.entries(filter)) url.searchParams.set(key, `eq.${value}`);
  const result = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(values),
  });
  if (!result.ok && result.status !== 404) {
    const details = await result.text();
    if (optional) {
      console.warn(`Optional Supabase ${table} update skipped (${result.status})`);
      return false;
    }
    throw new Error(`Supabase ${table} update failed (${result.status}): ${details.slice(0, 240)}`);
  }
  if (result.status === 404) return false;
  const rows = await result.json();
  if (!rows?.length && !optional) throw new Error(`Supabase ${table} account row not found`);
  return Boolean(rows?.length);
}

async function createSubscription(baseUrl, serviceKey, userId, email, values) {
  const url = new URL('/rest/v1/subscriptions', baseUrl);
  const result = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      email,
      is_pro: true,
      pro_expiry: values.pro_expiry,
      pro_plan: values.pro_plan,
      download_count: 0,
    }),
  });
  if (!result.ok) {
    const details = await result.text();
    throw new Error(`Supabase subscriptions create failed (${result.status}): ${details.slice(0, 240)}`);
  }
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
  const userId = authData?.id;
  if (!authResponse.ok || !authenticatedEmail || !userId || authenticatedEmail !== requestedEmail) {
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
    is_pro: true,
    pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    pro_plan: 'PopWord Pro Monthly - TEST',
    download_count: 0,
  };
  const profileValues = {
    is_pro: true,
    pro_plan: values.pro_plan,
  };

  try {
    const profileUpdated = await patchTable(supabaseUrl, serviceKey, 'profiles', { email: authenticatedEmail }, profileValues, true);
    let subscriptionUpdated = await patchTable(supabaseUrl, serviceKey, 'subscriptions', { email: authenticatedEmail }, values, true);
    if (!subscriptionUpdated) {
      subscriptionUpdated = await patchTable(supabaseUrl, serviceKey, 'subscriptions', { user_id: userId }, values, true);
    }
    await patchTable(supabaseUrl, serviceKey, 'users', { email: authenticatedEmail }, {
      is_pro: true,
      pro_plan: profileValues.pro_plan,
      pro_since: profileValues.pro_since,
    }, true);
    if (!subscriptionUpdated) await createSubscription(supabaseUrl, serviceKey, userId, authenticatedEmail, values);
    if (!profileUpdated && !subscriptionUpdated) console.info('Pro activation created a new subscription record');
  } catch (error) {
    console.error(error);
    return json({ error: error.message.startsWith('Supabase subscriptions') ? error.message : 'Pro activation failed' }, 500);
  }

  return json({ pro: true });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  return onRequestGet(context);
}
