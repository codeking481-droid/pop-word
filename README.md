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

## Gumroad Pro activation

The Upgrade link opens the configured Gumroad product page. Gumroad should
redirect successful payments to `/payment-success?license=...`. That page sends
the license to the Cloudflare Pages Function, which verifies it server-side
and activates Pro.

Set these Cloudflare Pages **Production** variables and secrets:

- `GUMROAD_PRODUCT_ID` (set to `qyveh`)
- `GUMROAD_ACCESS_TOKEN` (Secret; required for real license verification)
- `GUMROAD_ALLOW_TEST_LICENSES` (set to `true` only for temporary `TEST-...`
  testing when no Gumroad token is configured)
- `SUPABASE_SERVICE_ROLE_KEY` (Secret)
- `SUPABASE_URL` (Plaintext URL)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend auth)
- `VITE_GUMROAD_PAGE` (`https://coderking7.gumroad.com/l/qyveh`)

Configure the Gumroad redirect URL as:

`https://pop-word.pages.dev/payment-success`

The verification endpoint is:

`https://pop-word.pages.dev/api/verify-popword`

Never expose `GUMROAD_ACCESS_TOKEN` or `SUPABASE_SERVICE_ROLE_KEY` in Vite or
browser code.

## Cloudflare Pages

Connect the repository in Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
