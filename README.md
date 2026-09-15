# PopUp

PopUp is a fully offline browser-rendered viral word-pop video generator. Scripts, animations, media, and video exports run locally without accounts, backend services, or payment overlays.

## Local development

```bash
npm install
npm run dev
```

## Optional Google signup

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` or Cloudflare Pages Production variables. When both values are present, the editor requires Google sign-in before it can be used. Configure Google as an enabled Supabase Auth provider and allow `https://pop-word.pages.dev/` plus `http://localhost:5173/` as redirect URLs. Without these variables, the app remains fully offline.

## Production build

```bash
npm run lint
npm run build
```

The production output is written to `dist/`.

Signed-in users receive exactly three trial video exports. Each successful
single, batch, or multi-format export consumes one trial export. Once
`download_count` reaches 3, further exports require an active Pro subscription.

The editor also includes an optional Social safe zones preview overlay. It is
visual guidance only and is never included in exported videos.

For picture-in-picture captions, enable **Transparent BG (PiP for CapCut)**.
The editor exports a VP9 WebM with a transparent canvas when the browser
supports it; import that file as an overlay in CapCut or InShot.

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

The editor displays the live plan as approximately `$2/month` beside Upgrade.
Paystack charges the configured plan currency and amount (currently NGN 3,000);
the label is only a convenience USD estimate.

Never expose `PAYSTACK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Vite or
browser code.

## Cloudflare Pages

Connect the repository in Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
