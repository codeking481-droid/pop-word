const PAYSTACK_API = 'https://api.paystack.co';
const EXPECTED_AMOUNT = 300000;
const EXPECTED_CURRENCY = 'NGN';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function hexToBytes(value) {
  if (!/^[\da-f]{128}$/i.test(value)) return null;
  const bytes = new Uint8Array(64);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function verifySignature(rawBody, signature, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['verify'],
  );
  const expected = hexToBytes(signature);
  return expected
    ? crypto.subtle.verify('HMAC', key, expected, new TextEncoder().encode(rawBody))
    : false;
}

async function supabaseRequest(url, serviceRoleKey, options = {}) {
  const responseFromSupabase = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await responseFromSupabase.text();
  if (!responseFromSupabase.ok) {
    throw new Error(`Supabase request failed (${responseFromSupabase.status}): ${body}`);
  }
  return body ? JSON.parse(body) : null;
}

export async function onRequestPost({ request, env }) {
  const secret = env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const signature = request.headers.get('x-paystack-signature');

  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return response({ error: 'Webhook is not configured' }, 500);
  }
  if (!signature) return response({ error: 'Missing Paystack signature' }, 401);

  const rawBody = await request.text();
  if (!(await verifySignature(rawBody, signature, secret))) {
    return response({ error: 'Invalid Paystack signature' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response({ error: 'Invalid JSON payload' }, 400);
  }

  if (payload.event !== 'charge.success') return response({ received: true });

  const reference = payload.data?.reference;
  const email = payload.data?.customer?.email?.trim().toLowerCase();
  if (!reference || !email) return response({ error: 'Missing transaction details' }, 400);

  const verificationResponse = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!verificationResponse.ok) return response({ error: 'Paystack verification failed' }, 502);

  const verification = await verificationResponse.json();
  const transaction = verification.data;
  if (
    verification.status !== true ||
    transaction?.status !== 'success' ||
    transaction.amount !== EXPECTED_AMOUNT ||
    transaction.currency !== EXPECTED_CURRENCY ||
    transaction.customer?.email?.trim().toLowerCase() !== email
  ) {
    return response({ error: 'Transaction validation failed' }, 400);
  }

  const query = new URL('/rest/v1/subscriptions', supabaseUrl);
  query.searchParams.set('select', 'user_id,paystack_ref');
  query.searchParams.set('email', `eq.${email}`);
  query.searchParams.set('limit', '1');

  try {
    const rows = await supabaseRequest(query, serviceRoleKey);
    const existing = rows?.[0];
    if (!existing) return response({ error: 'Subscription account not found' }, 404);
    if (existing.paystack_ref === reference) return response({ received: true, duplicate: true });

    const updateUrl = new URL('/rest/v1/subscriptions', supabaseUrl);
    updateUrl.searchParams.set('user_id', `eq.${existing.user_id}`);
    await supabaseRequest(updateUrl, serviceRoleKey, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pro',
        download_count: 0,
        paystack_ref: reference,
        activated_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error(error);
    return response({ error: 'Subscription activation failed' }, 500);
  }

  return response({ received: true, activated: true });
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  return onRequestPost(context);
}
