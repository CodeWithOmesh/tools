import Decimal from "decimal.js";
import type { Quotation } from "./types";

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

export function formatMoney(
  value: Decimal | string | number,
  currency: string,
  locale = "en-US",
): string {
  const digits = currencyDigits(currency);
  const rounded = decimal(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  try {
    return new Intl.NumberFormat(locale, {
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
// such as ₹ ₱ ₩ ₫ ₪ or the Unicode minus sign, are silently replaced with wrong glyphs.
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(rounded.toFixed(digits)));
  } catch {
    return `${currency} ${rounded.toFixed(digits)}`;
  }
}

export interface QuotationTotals {
  subtotal: Decimal;
  discount: Decimal;
  taxableAmount: Decimal;
  tax: Decimal;
  total: Decimal;
}

export function calculateQuotation(quotation: Quotation): QuotationTotals {
  const digits = currencyDigits(quotation.currency);
  const round = (value: Decimal) => value.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  const subtotal = round(
    quotation.items.reduce((sum, item) => {
      const quantity = decimal(item.quantity);
      const unitPrice = decimal(item.unitPrice);
      if (quantity.isNegative() || unitPrice.isNegative()) return sum;
      return sum.plus(quantity.times(unitPrice));
    }, new Decimal(0)),
  );
  const discountRaw =
    quotation.discountType === "percentage"
      ? subtotal.times(decimal(quotation.discountValue)).div(100)
      : decimal(quotation.discountValue);
  const discount = round(Decimal.max(0, Decimal.min(subtotal, discountRaw)));
  const taxableAmount = round(Decimal.max(0, subtotal.minus(discount)));
  const tax = round(Decimal.max(0, taxableAmount.times(decimal(quotation.taxRate)).div(100)));
  const total = round(taxableAmount.plus(tax));
  return { subtotal, discount, taxableAmount, tax, total };
}
