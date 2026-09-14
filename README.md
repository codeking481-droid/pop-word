# PopUp

PopUp is a fully offline browser-rendered viral word-pop video generator. Scripts, animations, media, and video exports run locally without accounts, backend services, or payment overlays.

## Local development

```bash
npm install
npm run dev
```

## Optional Google signup

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` or Cloudflare Pages Production variables. When both values are present, the editor shows a non-dismissible Google signup gate until a Supabase session is established. Configure Google as an enabled Supabase Auth provider and allow `https://pop-word.pages.dev/` plus `http://localhost:5173/` as redirect URLs. Without these variables, the app remains fully offline.

## Production build

```bash
npm run lint
npm run build
```

The production output is written to `dist/`.

## Paystack Pro activation

The Upgrade link opens Paystack Checkout. Pro access is activated only by the
Supabase Edge Function after Paystack confirms a successful transaction.

Deploy the function and set its secrets:

```bash
supabase functions deploy paystack-webhook
supabase secrets set PAYSTACK_SECRET_KEY=your_paystack_secret_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Run `supabase/schema.sql` in the Supabase SQL editor, then configure this
Paystack webhook URL:

`https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook`

Never expose either secret in Vite or browser code.

## Cloudflare Pages

Connect the repository in Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
