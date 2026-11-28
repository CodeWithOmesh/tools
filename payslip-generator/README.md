# Payslip Generator

A free, browser-based payslip (salary slip) creator built with React, TypeScript, Vite and Decimal.js.

## Features

- Monthly or custom-date pay periods, pay date and optional payslip number
- Company details with an optional logo and registration number
- Employee details: ID, designation, department, join date, tax/ID number, working days, bank and account number (optionally showing only the last 4 digits)
- Basic salary plus any number of earnings, each a fixed amount or a percentage of basic pay
- Deductions as a fixed amount or a percentage of basic or gross pay
- One-click presets for Sri Lanka (EPF 8% / employer EPF 12% and ETF 3%) and India (PF 12% / employer PF 12%)
- Optional employer contributions, shown for information without changing net pay
- Gross pay, total deductions and net pay with currency-aware rounding
- Net pay in words, using lakh and crore for South Asian currencies
- "Next pay period" to make the following month's payslip in one click
- Simple and Professional layouts, optional notes, footer and signature lines
- PDF download using a lazily loaded `@react-pdf/renderer` module, plus A4 browser printing
- Local browser draft autosave and responsive editor/preview tabs on mobile

The built-in PDF font cannot draw Sinhala, Tamil, Hindi and similar scripts. When the payslip contains them, the app asks the user to print and save as PDF instead.

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

Company, employee, salary and bank details are processed and stored only in the current browser. The app has no backend and sends nothing anywhere. "New payslip" clears the saved draft, which is worth doing on shared computers.
