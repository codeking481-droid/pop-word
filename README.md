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

The Upgrade link opens the configured Paystack payment page. Paystack should
redirect successful payments to `/payment-success`. That page sends the
transaction reference to the Cloudflare Pages Function, which verifies the
transaction server-side and activates Pro without using a Paystack webhook.

Set these Cloudflare Pages **Production** variables and secrets:

- `PAYSTACK_SECRET_KEY` (Secret)
- `SUPABASE_SERVICE_ROLE_KEY` (Secret)
- `SUPABASE_URL` (Plaintext URL)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend auth)
- `VITE_PAYSTACK_PAGE` (Paystack payment link)

Configure the Paystack redirect URL as:

`https://pop-word.pages.dev/payment-success`

The verification endpoint is:

`https://pop-word.pages.dev/api/verify-popword`

Never expose `PAYSTACK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Vite or
browser code.

## Cloudflare Pages

Connect the repository in Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
