import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYSTACK_API = 'https://api.paystack.co';
const EXPECTED_AMOUNT = 300000;
const EXPECTED_CURRENCY = 'NGN';

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    customer?: { email?: string };
  };
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function hasValidSignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return signature.length === expected.length &&
    [...signature].every((character, index) => character.toLowerCase() === expected[index]);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const signature = request.headers.get('x-paystack-signature');
  if (!secret || !supabaseUrl || !serviceRoleKey || !signature) {
    return json({ error: 'Webhook is not configured' }, 500);
  }

  const rawBody = await request.text();
  if (!(await hasValidSignature(rawBody, signature, secret))) {
    return json({ error: 'Invalid signature' }, 401);
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  if (payload.event !== 'charge.success') return json({ received: true });

  const reference = payload.data?.reference;
  const email = payload.data?.customer?.email?.trim().toLowerCase();
  if (!reference || !email) return json({ error: 'Missing transaction details' }, 400);

  const verificationResponse = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!verificationResponse.ok) return json({ error: 'Paystack verification failed' }, 502);

  const verification = await verificationResponse.json();
  const transaction = verification?.data;
  if (
    verification?.status !== true ||
    transaction?.status !== 'success' ||
    transaction?.amount !== EXPECTED_AMOUNT ||
    transaction?.currency !== EXPECTED_CURRENCY ||
    transaction?.customer?.email?.trim().toLowerCase() !== email
  ) {
    return json({ error: 'Transaction validation failed' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existing, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id, paystack_ref')
    .eq('email', email)
    .maybeSingle();
  if (lookupError) return json({ error: 'Subscription lookup failed' }, 500);
  if (!existing) return json({ error: 'Subscription account not found' }, 404);
  if (existing.paystack_ref === reference) return json({ received: true, duplicate: true });

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      pro_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pro',
      download_count: 0,
      paystack_ref: reference,
      activated_at: new Date().toISOString(),
    })
    .eq('user_id', existing.user_id);
  if (updateError) return json({ error: 'Subscription activation failed' }, 500);

  return json({ received: true, activated: true });
});
