# PopUp

PopUp is an offline viral word-pop video generator. Scripts, animations, media, music, GIFs, and video exports run in the browser without an account, backend, or API key.

## Local development

```bash
npm install
npm run dev
```

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
