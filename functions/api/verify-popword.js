const GUMROAD_PRODUCT_ID = 'qyveh';

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
      pro_expiry: values.pro_expiry,
      download_count: 0,
    }),
  });
  if (!result.ok) {
    const details = await result.text();
    throw new Error(`Supabase subscriptions create failed (${result.status}): ${details.slice(0, 240)}`);
  }
}

export async function onRequestGet({ request, env }) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const params = new URL(request.url).searchParams;
  const reference = params.get('reference');
  const requestedEmail = params.get('email')?.trim().toLowerCase();

  const license = params.get('license')?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'Verification is not configured' }, 500);
  if (!accessToken || (!reference && !license) || !requestedEmail) return json({ error: 'Authentication and payment reference are required' }, 400);

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  const authData = await authResponse.json();
  const authenticatedEmail = authData?.email?.trim().toLowerCase();
  const userId = authData?.id;
  if (!authResponse.ok || !authenticatedEmail || !userId || authenticatedEmail !== requestedEmail) {
    return json({ error: 'Authenticated email does not match payment email' }, 403);
  }

  if (license) {
    if (!env.GUMROAD_ACCESS_TOKEN) {
      if (env.GUMROAD_ALLOW_TEST_LICENSES !== 'true' || !/^TEST-[A-Z0-9-]+$/i.test(license)) {
        return json({ error: 'Gumroad verification is not configured' }, 500);
      }
    } else {
      const verifyBody = new URLSearchParams({ product_id: env.GUMROAD_PRODUCT_ID || GUMROAD_PRODUCT_ID, license_key: license });
      const verifyResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyBody,
      });
      if (!verifyResponse.ok) return json({ error: 'Gumroad verification failed' }, 502);
      const verification = await verifyResponse.json();
      const purchaseEmail = verification?.purchase?.email?.trim().toLowerCase();
      if (!verification?.success || purchaseEmail !== authenticatedEmail) {
        return json({ error: 'Gumroad license could not be verified' }, 400);
      }
    }
  }

  const values = {
    pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    download_count: 0,
  };
  const profileValues = {
    is_pro: true,
    pro_plan: 'PopWord Pro Monthly',
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
