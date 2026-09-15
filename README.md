# PopUp

PopUp is a fully offline browser-rendered viral word-pop video generator. Scripts, animations, media, and video exports run locally without accounts, backend services, or payment overlays.

## Local development

```bash
npm install
npm run dev
```

## Optional Google signup

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` or Cloudflare Pages Production variables. When both values are present, the editor shows a Google signup prompt. Visitors can continue without signing in; that choice is remembered in the browser. Configure Google as an enabled Supabase Auth provider and allow `https://pop-word.pages.dev/` plus `http://localhost:5173/` as redirect URLs. Without these variables, the app remains fully offline.

## Production build

```bash
npm run lint
npm run build
```

The production output is written to `dist/`.

## Paystack Pro activation

The Upgrade button starts a Paystack transaction through the Cloudflare Pages
Function `/api/create-popword-payment`. Paystack redirects successful payments
to `/payment-success?reference=...`. That page sends the reference to
`/api/verify-popword`, which verifies the transaction server-side and activates
the authenticated account for 30 days.

Set these Cloudflare Pages **Production** variables and secrets:

- `PAYSTACK_SECRET_KEY` (Secret; use the matching test or live key)
- `PAYSTACK_PLAN_CODE` (set to `PLN_w7htm2j67axsrv9` for the live PopWord plan)
- `SUPABASE_SERVICE_ROLE_KEY` (Secret)
- `SUPABASE_URL` (Plaintext URL)
- `SUPABASE_ANON_KEY` (or the frontend `VITE_SUPABASE_ANON_KEY`)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend auth)

The payment callback is:

`https://pop-word.pages.dev/payment-success`

Never expose `PAYSTACK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Vite or
browser code.

## Cloudflare Pages

Connect the repository in Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
