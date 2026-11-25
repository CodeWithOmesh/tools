# Image Tools

Free, privacy-first image tools for [Code with Omesh](https://codewithomesh.com/tools/image-tools/).
Everything runs in the browser: images are never uploaded.

| Tool | Route | What it does |
|---|---|---|
| Resize Image | `/tools/image-tools/resize-image` | Resize one or many images by pixels, percentage or social media size (ZIP for several) |
| Convert Image | `/tools/image-tools/convert-image` | Convert JPG, PNG, WebP, GIF, BMP, AVIF and SVG to JPG, PNG or WebP |
| Crop Image | `/tools/image-tools/crop-image` | Crop to a free or fixed shape (1:1, 4:5, 16:9…), rotate and flip |

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/tools/image-tools/`.

## Verify and build

```bash
npm test
npm run typecheck
npm run build
```

## How it works

- `src/lib/geometry.ts` – resize plans (fit, stretch, crop to fill, border) and crop maths. Pure functions, covered by tests.
- `src/lib/formats.ts` – supported types, output names and friendly errors (including HEIC photos). Covered by tests.
- `src/lib/render.ts` – decodes images (phone photos are turned the right way up), draws them on a canvas with high-quality downscaling, and encodes JPG, PNG or WebP.
- `src/lib/batch.ts` – processes images one at a time and downloads one file or a ZIP.
- Output is limited to about 16 megapixels, the largest canvas every browser can create.
