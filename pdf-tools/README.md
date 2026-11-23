# PDF Tools

Free, privacy-first PDF tools for [Code with Omesh](https://codewithomesh.com/tools/pdf-tools/).
Everything runs in the browser: files are never uploaded.

| Tool | Route | What it does |
|---|---|---|
| Merge PDF | `/tools/pdf-tools/merge-pdf` | Combine several PDFs in a chosen order |
| Split PDF | `/tools/pdf-tools/split-pdf` | Extract pages, split by ranges, or save every page separately (ZIP) |
| JPG to PDF | `/tools/pdf-tools/jpg-to-pdf` | Turn JPG, PNG and WebP images into one PDF (A4, Letter or image size) |
| Organize PDF | `/tools/pdf-tools/organize-pdf` | Rotate, reorder and delete pages with live previews |

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/tools/pdf-tools/`.

## Verify and build

```bash
npm test
npm run typecheck
npm run build
```

## How it works

- `src/lib/pdf.ts` – all PDF editing, using [pdf-lib](https://pdf-lib.js.org/). Pure functions, covered by tests.
- `src/lib/ranges.ts` – page-range parsing such as `1-3, 5, 8-`.
- `src/lib/thumbnails.ts` – page previews with [pdf.js](https://mozilla.github.io/pdf.js/) (legacy build, for older browsers).
- `src/lib/images.ts` – redraws images on a canvas so phone photos are the right way up and WebP becomes JPEG.

pdf-lib, pdf.js and JSZip are loaded only when a tool needs them, so the first page load stays small.

## Limits

- PDFs up to 100 MB each, images up to 25 MB each. Very large files depend on the device's memory.
- Password-protected PDFs are not supported; users are asked to remove the password first.
- Merging and splitting keep the original page content. Interactive form fields and bookmarks may not be carried over.
