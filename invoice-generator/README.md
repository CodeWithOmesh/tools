# Invoice Generator

A free, browser-based invoice creator built with React, TypeScript, Vite and Tailwind-compatible styling.

## Features

- Simple and Professional invoice layouts
- Searchable list of commonly used currencies with currency-aware decimal precision
- Seller and client details, optional business logo and tax IDs
- Invoice number, issue date and due date
- Dynamic line items with quantity and unit price
- Fixed or percentage discount and configurable percentage tax
- Amount paid, payment status and outstanding balance
- Live invoice preview
- PDF download using `@react-pdf/renderer`
- A4 browser printing
- Local browser draft persistence
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

The root repository scripts automatically discover this project and include it in combined build and verification.

## Privacy

Invoice details and drafts are processed and stored locally in the current browser. The app does not send invoice data to a backend. Logo uploads are kept as a browser data URL in the local draft. Use a trusted device and avoid sharing access to its browser profile.

## Notes

The PDF download is generated in the browser. Browser print uses the A4 layout; verify printer scaling and margins before sending an invoice to a customer.
