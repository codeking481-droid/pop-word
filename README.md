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

For picture-in-picture captions, enable **Transparent caption (text only)**.
The preview and downloaded file contain only the animated words: no selected
background, progress bar, logo, or green fill. The editor exports a VP9 WebM
with a real alpha channel, recorded for at least five seconds so it can be
placed over another video. CapCut desktop/web and other alpha-video editors
can use it directly. CapCut/InShot mobile may not import VP9 WebM alpha files;
those apps require a chroma-key MP4 workflow instead of genuine transparent
video. When the toggle is off, the editor exports the normal selected
background.

To sync captions to an existing voiceover, enter its exact length in
**Voiceover length (seconds)**. Durations from 2 seconds to 60 minutes are
supported. That locks the clip duration while the visual speed control changes
only the animation feel. Leaving it blank uses an automatic speech-length
estimate based on the script.

The **Motion Typography Smooth** template defaults to `#FFEB00` with large,
tight typography, alternating black/blue phrase emphasis, and smooth stacked
enter/exit motion. Its background can be changed with the color controls. Add
phrases on separate lines for exact timing, or enter a longer sentence and it
will split into punctuation and two-word meaning chunks automatically. Use the
Motion speed slider to slow down or speed up the animation; shared solid,
gradient, image, and uploaded media backgrounds remain visible behind the text.

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
