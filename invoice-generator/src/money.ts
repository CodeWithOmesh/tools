import Decimal from "decimal.js";
import type { Invoice } from "./types";

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
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function formatMoney(value: Decimal | string | number, currency: string, locale = "en-US"): string {
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

export interface InvoiceTotals {
  subtotal: Decimal;
  discount: Decimal;
  taxableAmount: Decimal;
  tax: Decimal;
  total: Decimal;
  amountPaid: Decimal;
  amountDue: Decimal;
  status: "Unpaid" | "Partially paid" | "Paid";
}

export function calculateInvoice(invoice: Invoice): InvoiceTotals {
  const digits = currencyDigits(invoice.currency);
  const round = (value: Decimal) => value.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  const subtotal = round(invoice.items.reduce((sum, item) => {
    const quantity = decimal(item.quantity);
    const unitPrice = decimal(item.unitPrice);
    if (quantity.isNegative() || unitPrice.isNegative()) return sum;
    return sum.plus(quantity.times(unitPrice));
  }, new Decimal(0)));

  const discountRaw = invoice.discountType === "percentage"
    ? subtotal.times(decimal(invoice.discountValue)).div(100)
    : decimal(invoice.discountValue);
  const discount = round(Decimal.max(0, Decimal.min(subtotal, discountRaw)));
  const taxableAmount = round(Decimal.max(0, subtotal.minus(discount)));
  const tax = round(Decimal.max(0, taxableAmount.times(decimal(invoice.taxRate)).div(100)));
  const total = round(taxableAmount.plus(tax));
  const amountPaid = round(Decimal.max(0, decimal(invoice.amountPaid)));
  const amountDue = round(Decimal.max(0, total.minus(amountPaid)));
  const status = amountDue.lte(0) && total.gt(0)
    ? "Paid"
    : amountPaid.gt(0) && amountDue.gt(0)
      ? "Partially paid"
      : "Unpaid";

  return { subtotal, discount, taxableAmount, tax, total, amountPaid, amountDue, status };
}
