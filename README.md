# PopUp

PopUp is a fully offline browser-rendered viral word-pop video generator. Scripts, animations, media, and video exports run locally without accounts, backend services, or payment overlays.

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
