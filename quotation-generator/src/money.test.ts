import { describe, expect, it } from "vitest";
import { calculateQuotation, currencyDigits, formatMoney, formatMoneyForPdf } from "./money";
import { createDefaultQuotation, validateQuotation } from "./types";

describe("PDF money formatting", () => {
  it("keeps USD and EUR symbols the PDF font can draw", () => {
    expect(formatMoneyForPdf("1234.5", "USD")).toBe("$1,234.50");
    expect(formatMoneyForPdf("1234.5", "EUR")).toBe("€1,234.50");
  });

  it("falls back to the ISO code for INR, PHP and KRW", () => {
    for (const currency of ["INR", "PHP", "KRW"]) {
      const formatted = formatMoneyForPdf("1234.5", currency);
      expect(formatted.startsWith(currency)).toBe(true);
      expect(formatted).not.toContain("₹");
      expect(formatted).not.toContain("₱");
      expect(formatted).not.toContain("₩");
    }
  });
});

describe("quotation validation", () => {
  const validQuotation = () => {
    const quotation = createDefaultQuotation();
    quotation.business.name = "Acme Studio";
    quotation.client.name = "Globex";
    quotation.items = [{ id: "1", description: "Design", quantity: "1", unitPrice: "100" }];
    return quotation;
  };

  it("accepts a valid quotation", () => {
    expect(validateQuotation(validQuotation())).toBeNull();
  });

  it("requires business and client names", () => {
    const quotation = validQuotation();
    quotation.business.name = " ";
    expect(validateQuotation(quotation)).toContain("business name");
    quotation.business.name = "Acme";
    quotation.client.name = "";
    expect(validateQuotation(quotation)).toContain("client");
  });

  it("rejects a valid-until date before the issue date", () => {
    const quotation = validQuotation();
    quotation.issueDate = "2026-05-10";
    quotation.validUntil = "2026-05-01";
    expect(validateQuotation(quotation)).toContain("valid-until date");
  });

  it("rejects percentage discounts over 100%", () => {
    const quotation = validQuotation();
    quotation.discountType = "percentage";
    quotation.discountValue = "120";
    expect(validateQuotation(quotation)).toContain("100%");
  });
});

describe("quotation calculations", () => {
  it("applies a fixed discount before tax", () => {
    const quotation = createDefaultQuotation();
    quotation.items = [
      { id: "1", description: "Design", quantity: "2", unitPrice: "100" },
      { id: "2", description: "Hosting", quantity: "1", unitPrice: "50" },
    ];
    quotation.discountType = "fixed";
    quotation.discountValue = "25";
    quotation.taxRate = "10";

    const totals = calculateQuotation(quotation);
    expect(totals.subtotal.toFixed(2)).toBe("250.00");
    expect(totals.discount.toFixed(2)).toBe("25.00");
    expect(totals.tax.toFixed(2)).toBe("22.50");
    expect(totals.total.toFixed(2)).toBe("247.50");
  });

  it("applies a percentage discount", () => {
    const quotation = createDefaultQuotation();
    quotation.items = [{ id: "1", description: "Work", quantity: "1", unitPrice: "400" }];
    quotation.discountType = "percentage";
    quotation.discountValue = "15";
    quotation.taxRate = "0";

    const totals = calculateQuotation(quotation);
    expect(totals.discount.toFixed(2)).toBe("60.00");
    expect(totals.total.toFixed(2)).toBe("340.00");
  });

  it("caps a discount at the subtotal", () => {
    const quotation = createDefaultQuotation();
    quotation.items = [{ id: "1", description: "Item", quantity: "1", unitPrice: "10" }];
    quotation.discountValue = "50";

    const totals = calculateQuotation(quotation);
    expect(totals.discount.toFixed(2)).toBe("10.00");
    expect(totals.taxableAmount.toFixed(2)).toBe("0.00");
    expect(totals.total.toFixed(2)).toBe("0.00");
  });

  it("rounds currencies with zero minor units", () => {
    const quotation = createDefaultQuotation();
    quotation.currency = "JPY";
    quotation.items = [{ id: "1", description: "Item", quantity: "1", unitPrice: "1234.5" }];

    const totals = calculateQuotation(quotation);
    expect(currencyDigits("JPY")).toBe(0);
    expect(totals.subtotal.toFixed(0)).toBe("1235");
    expect(formatMoney("1234.5", "JPY")).toContain("1,235");
  });
});
