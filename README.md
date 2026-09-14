# PopUp

PopUp is a browser-rendered viral word-pop video generator. Scripts, animations, media, and video exports run locally. Optional Supabase authentication enables account-backed export limits; the editor still renders and exports on the client.

## Local development

```bash
npm install
npm run dev
```

## Optional authentication and exports

Copy `.env.example` to `.env.local` and add the Supabase anon key from the project settings. Never put a Google OAuth client secret or a Supabase service-role key in frontend environment variables. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor before enabling authentication.

Google OAuth must be enabled in Supabase Auth and configured with the deployed site URL and local callback origins. Pro access must be granted by a server-side Paystack webhook or verified Edge Function; the browser never grants Pro access directly.

Paystack uses the inline checkout popup loaded from `js.paystack.co`; configure `VITE_PAYSTACK_PUBLIC_KEY` in Cloudflare Pages. The callback only refreshes status; a verified payment webhook/Edge Function must update `pro_expiry`. Do not put a Paystack secret key in frontend variables.

## Production build

```bash
npm run lint
npm run build
```

The production output is written to `dist/`.

## Cloudflare Pages

Connect the repository in Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
