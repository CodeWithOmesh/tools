# Free Receipt Generator

**Code with Omesh** · [codewithomesh.com](https://codewithomesh.com)

Create, customize, preview, print and download professional receipts in the browser.

**Production route:** `/tools/receipt-generator/`

## Features

- Simple and Professional receipt templates
- Searchable ISO currency selector with currency-aware decimal precision
- Business information and optional PNG, JPG or WebP logo
- Customer information and itemized products or services
- Fixed or percentage discounts and taxes
- Paid, partially paid and unpaid states derived from payment amounts
- Live receipt preview
- Browser-generated PDF downloads
- Browser printing with A4, 80 mm and 58 mm layouts
- Local draft persistence
- Responsive desktop and mobile interface
- No registration and no receipt-data backend

## Technology

React, Vite, TypeScript, Tailwind CSS, Zustand, Zod, decimal.js, @react-pdf/renderer, idb-keyval and Vitest.

## Requirements

- Node.js 20 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Vite uses `/tools/receipt-generator/` as its base path by default so local preview matches the production route.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

When building through the repository root, the tool writes its output to `../dist/tools/receipt-generator`. The root build script discovers and builds each tool folder independently.

## Privacy

Receipt details are processed in the visitor's browser. Draft fields are saved in local storage; an uploaded logo is stored separately in IndexedDB on the same device. Receipt details and customer information are not uploaded to an application backend.

## Disclaimer

This tool creates general payment receipts. It is not accounting, tax or legal advice. Receipt and tax requirements vary by jurisdiction; users are responsible for confirming local requirements.
