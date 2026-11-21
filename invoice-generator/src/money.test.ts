import { describe, expect, it } from "vitest";
import { calculateInvoice, currencyDigits, formatMoney } from "./money";
import { createDefaultInvoice } from "./types";

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
