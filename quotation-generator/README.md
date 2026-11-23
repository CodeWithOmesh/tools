# Quotation / Estimate Generator

A free, browser-based quotation and estimate creator built with React, TypeScript, Vite and Decimal.js.

## Features

- Simple and Professional quotation layouts
- Business and client details, optional business logo and tax IDs
- Quote number, issue date and validity date
- Dynamic line items with quantity, unit price, and reorder controls
- Fixed or percentage discounts and configurable percentage tax
- Currency-aware calculations and rounding
- Optional scope of work, terms, notes, footer message and acceptance block
- Live quotation preview
- PDF download using a lazily loaded `@react-pdf/renderer` module
- A4 browser printing
- Local browser draft autosave
- Responsive editor and preview tabs on mobile
- SEO metadata and FAQ content

## Run locally

From this directory:

```bash
npm install
npm run dev
```

## Verify and build

```bash
npm run typecheck
npm test
npm run build
```

## Privacy

Quotation details, uploaded logo data and drafts are processed and stored locally in the current browser. The app does not send quotation data to a backend. Use a trusted device and avoid sharing access to its browser profile.
