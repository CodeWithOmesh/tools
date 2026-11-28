import Decimal from "decimal.js";
import type { LineMode, PayLine, Payslip } from "./types";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export function decimal(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function currencyDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Indian rupees are grouped the Indian way (1,50,000); everything else in thousands. */
function moneyLocale(currency: string): string {
  return currency === "INR" ? "en-IN" : "en-US";
}

export function formatMoney(value: Decimal | string | number, currency: string): string {
  const digits = currencyDigits(currency);
  const rounded = decimal(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  try {
    return new Intl.NumberFormat(moneyLocale(currency), {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(rounded.toFixed(digits)));
  } catch {
    return `${currency} ${rounded.toFixed(digits)}`;
  }
}

// The built-in PDF fonts (Helvetica) use WinAnsi encoding. Characters outside that set,
// such as ₹ ₱ ₩ ₫ ₪, Sinhala, Tamil or Hindi letters, cannot be drawn.
const WIN_ANSI_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

export function isPdfSafeText(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const printable = (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
    if (!printable && code !== 0x0a && !WIN_ANSI_EXTRAS.has(char)) return false;
  }
  return true;
}

/** Formats money for the PDF, falling back to the ISO code when the symbol cannot be drawn. */
export function formatMoneyForPdf(value: Decimal | string | number, currency: string): string {
  const formatted = formatMoney(value, currency);
  if (isPdfSafeText(formatted)) return formatted;
  const digits = currencyDigits(currency);
  const rounded = decimal(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  try {
    return new Intl.NumberFormat(moneyLocale(currency), {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
      .format(Number(rounded.toFixed(digits)))
      .replace(/ /g, " ");
  } catch {
    return `${currency} ${rounded.toFixed(digits)}`;
  }
}

export interface LineAmount {
  line: PayLine;
  amount: Decimal;
}

export interface PayslipTotals {
  basic: Decimal;
  earnings: LineAmount[];
  gross: Decimal;
  deductions: LineAmount[];
  totalDeductions: Decimal;
  net: Decimal;
  employer: LineAmount[];
  totalEmployer: Decimal;
}

export function calculatePayslip(payslip: Payslip): PayslipTotals {
  const digits = currencyDigits(payslip.currency);
  const round = (value: Decimal) => value.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  const positive = (value: Decimal) =>
    value.isNegative() || value.isNaN() ? new Decimal(0) : value;
  const sum = (lines: LineAmount[]) =>
    lines.reduce((total, item) => total.plus(item.amount), new Decimal(0));

  const basic = round(positive(decimal(payslip.basicSalary)));
  const amountFor = (line: PayLine, gross: Decimal) => {
    const value = positive(decimal(line.value));
    const base: Record<LineMode, Decimal | null> = { amount: null, basic, gross };
    const of = base[line.mode];
    return round(of ? of.times(value).div(100) : value);
  };

  // Earnings cannot be a share of gross pay, because gross pay is made from them.
  const earnings = payslip.earnings.map((line) => ({
    line,
    amount: amountFor(line.mode === "gross" ? { ...line, mode: "basic" } : line, basic),
  }));
  const gross = basic.plus(sum(earnings));
  const deductions = payslip.deductions.map((line) => ({ line, amount: amountFor(line, gross) }));
  const totalDeductions = sum(deductions);
  const employer = payslip.showEmployerContributions
    ? payslip.employerContributions.map((line) => ({ line, amount: amountFor(line, gross) }))
    : [];
  return {
    basic,
    earnings,
    gross,
    deductions,
    totalDeductions,
    net: gross.minus(totalDeductions),
    employer,
    totalEmployer: sum(employer),
  };
}

/** A short description of how a line is worked out, e.g. "8% of basic". */
export function lineBasis(line: PayLine): string {
  if (line.mode === "amount") return "";
  const value = decimal(line.value).toString();
  return `${value}% of ${line.mode === "basic" ? "basic" : "gross"}`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest >= 20)
    parts.push(rest % 10 ? `${TENS[Math.floor(rest / 10)]}-${ONES[rest % 10]}` : TENS[rest / 10]);
  else if (rest) parts.push(ONES[rest]);
  return parts.join(" ");
}

function groupWords(value: bigint, scales: [bigint, string][]): string {
  if (value === 0n) return "";
  for (const [size, name] of scales) {
    if (value >= size) {
      const head = groupWords(value / size, scales);
      const tail = groupWords(value % size, scales);
      return [`${head} ${name}`, tail].filter(Boolean).join(" ");
    }
  }
  return belowThousand(Number(value));
}

const INTERNATIONAL: [bigint, string][] = [
  [1_000_000_000_000n, "Trillion"],
  [1_000_000_000n, "Billion"],
  [1_000_000n, "Million"],
  [1_000n, "Thousand"],
];
// South Asian numbering: 1,00,000 is one lakh and 1,00,00,000 is one crore.
const SOUTH_ASIAN: [bigint, string][] = [
  [10_000_000n, "Crore"],
  [100_000n, "Lakh"],
  [1_000n, "Thousand"],
];
const SOUTH_ASIAN_CURRENCIES = new Set(["INR", "LKR", "PKR", "NPR", "BDT"]);

/** Whole-number words, e.g. 1234 → "One Thousand Two Hundred Thirty-Four". */
export function numberToWords(
  value: bigint,
  system: "international" | "south-asian" = "international",
): string {
  if (value === 0n) return "Zero";
  return groupWords(value, system === "south-asian" ? SOUTH_ASIAN : INTERNATIONAL);
}

/**
 * An amount in words as written on payslips and cheques, e.g.
 * "LKR One Lakh Fifty Thousand and 50/100 Only".
 */
export function amountInWords(value: Decimal, currency: string): string {
  const digits = currencyDigits(currency);
  const rounded = Decimal.max(0, value).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  const whole = BigInt(rounded.floor().toFixed(0));
  const fraction = rounded
    .minus(rounded.floor())
    .times(10 ** digits)
    .toNumber();
  const system = SOUTH_ASIAN_CURRENCIES.has(currency) ? "south-asian" : "international";
  const words = numberToWords(whole, system);
  const cents =
    digits && fraction ? ` and ${String(fraction).padStart(digits, "0")}/${10 ** digits}` : "";
  return `${currency} ${words}${cents} Only`;
}
