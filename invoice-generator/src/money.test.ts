import { describe, expect, it } from "vitest";
import { calculateInvoice, currencyDigits, formatMoney, formatMoneyForPdf } from "./money";
import { createDefaultInvoice, validateInvoice } from "./types";

describe("PDF money formatting", () => {
  it("keeps symbols the PDF font can draw", () => {
    expect(formatMoneyForPdf("1234.5", "USD")).toBe("$1,234.50");
    expect(formatMoneyForPdf("1234.5", "EUR")).toBe("€1,234.50");
    expect(formatMoneyForPdf("1234.5", "GBP")).toBe("£1,234.50");
  });

  it("falls back to the ISO code for symbols the PDF font cannot draw", () => {
    for (const currency of ["INR", "PHP", "KRW", "VND", "ILS"]) {
      const formatted = formatMoneyForPdf("1234.5", currency);
      expect(formatted.startsWith(currency)).toBe(true);
    }
  });
});

describe("invoice validation", () => {
  const completeInvoice = () => {
    const invoice = createDefaultInvoice();
    invoice.seller.name = "Acme Studio";
    invoice.client.name = "Globex";
    invoice.items = [{ id: "1", description: "Design", quantity: "1", unitPrice: "100" }];
    return invoice;
  };

  it("accepts a complete invoice", () => {
    expect(validateInvoice(completeInvoice())).toBeNull();
  });

  it("requires business and client names", () => {
    const invoice = completeInvoice();
    invoice.seller.name = " ";
    expect(validateInvoice(invoice)).toContain("business name");
    invoice.seller.name = "Acme";
    invoice.client.name = "";
    expect(validateInvoice(invoice)).toContain("client");
  });

  it("rejects a due date before the issue date", () => {
    const invoice = completeInvoice();
    invoice.issueDate = "2026-05-10";
    invoice.dueDate = "2026-05-01";
    expect(validateInvoice(invoice)).toContain("due date");
  });

  it("rejects percentage discounts over 100%", () => {
    const invoice = completeInvoice();
    invoice.discountType = "percentage";
    invoice.discountValue = "120";
    expect(validateInvoice(invoice)).toContain("100%");
  });
});

describe("invoice calculations", () => {
  it("applies a fixed discount before tax", () => {
    const invoice = createDefaultInvoice();
    invoice.currency = "USD";
    invoice.items = [
      { id: "1", description: "Design", quantity: "2", unitPrice: "100" },
      { id: "2", description: "Hosting", quantity: "1", unitPrice: "50" },
    ];
    invoice.discountType = "fixed";
    invoice.discountValue = "25";
    invoice.taxRate = "10";

    const totals = calculateInvoice(invoice);
    expect(totals.subtotal.toFixed(2)).toBe("250.00");
    expect(totals.discount.toFixed(2)).toBe("25.00");
    expect(totals.tax.toFixed(2)).toBe("22.50");
    expect(totals.total.toFixed(2)).toBe("247.50");
  });

  it("applies a percentage discount and calculates a partial balance", () => {
    const invoice = createDefaultInvoice();
    invoice.items = [{ id: "1", description: "Work", quantity: "1", unitPrice: "400" }];
    invoice.discountType = "percentage";
    invoice.discountValue = "15";
    invoice.taxRate = "0";
    invoice.amountPaid = "100";

    const totals = calculateInvoice(invoice);
    expect(totals.discount.toFixed(2)).toBe("60.00");
    expect(totals.total.toFixed(2)).toBe("340.00");
    expect(totals.amountDue.toFixed(2)).toBe("240.00");
    expect(totals.status).toBe("Partially paid");
  });

  it("caps discounts at the subtotal and never returns a negative due amount", () => {
    const invoice = createDefaultInvoice();
    invoice.items = [{ id: "1", description: "Item", quantity: "1", unitPrice: "10" }];
    invoice.discountValue = "50";
    invoice.amountPaid = "100";

    const totals = calculateInvoice(invoice);
    expect(totals.discount.toFixed(2)).toBe("10.00");
    expect(totals.amountDue.toFixed(2)).toBe("0.00");
    expect(totals.status).toBe("Paid");
  });

  it("uses the currency's normal minor-unit precision", () => {
    expect(currencyDigits("JPY")).toBe(0);
    expect(currencyDigits("USD")).toBe(2);
    expect(formatMoney("1234.5", "JPY")).toContain("1,235");
  });

  it("keeps an empty invoice unpaid", () => {
    const invoice = createDefaultInvoice();
    invoice.items = [];
    expect(calculateInvoice(invoice).status).toBe("Unpaid");
  });
});
