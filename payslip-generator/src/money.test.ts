import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { maskAccountNumber, payslipFileName, periodLabel } from "./format";
import {
  amountInWords,
  calculatePayslip,
  formatMoney,
  formatMoneyForPdf,
  numberToWords,
} from "./money";
import {
  applyPreset,
  COUNTRY_PRESETS,
  createDefaultPayslip,
  defaultCurrency,
  incrementNumber,
  nextPayslip,
  validatePayslip,
  type Payslip,
} from "./types";

const payslip = (changes: Partial<Payslip> = {}): Payslip => {
  const base = createDefaultPayslip(new Date(2026, 10, 15));
  return {
    ...base,
    currency: "LKR",
    company: { ...base.company, name: "Acme (Pvt) Ltd" },
    employee: { ...base.employee, name: "Nimal Perera" },
    basicSalary: "100000",
    earnings: [{ id: "e1", label: "Transport", mode: "amount", value: "15000" }],
    deductions: [
      { id: "d1", label: "EPF", mode: "basic", value: "8" },
      { id: "d2", label: "Tax", mode: "amount", value: "2500.50" },
    ],
    ...changes,
  };
};

describe("payslip calculations", () => {
  it("adds earnings and works out percentage deductions", () => {
    const totals = calculatePayslip(payslip());
    expect(totals.gross.toString()).toBe("115000");
    expect(totals.deductions.map((item) => item.amount.toString())).toEqual(["8000", "2500.5"]);
    expect(totals.totalDeductions.toString()).toBe("10500.5");
    expect(totals.net.toString()).toBe("104499.5");
  });

  it("works out shares of gross pay and rounds each line", () => {
    const totals = calculatePayslip(
      payslip({ deductions: [{ id: "d", label: "ESI", mode: "gross", value: "0.75" }] }),
    );
    // 0.75% of 115,000 = 862.5
    expect(totals.deductions[0].amount.toString()).toBe("862.5");
    const odd = calculatePayslip(
      payslip({
        basicSalary: "33333.33",
        earnings: [],
        deductions: [{ id: "d", label: "x", mode: "basic", value: "8" }],
      }),
    );
    expect(odd.deductions[0].amount.toString()).toBe("2666.67");
  });

  it("lets earnings be a share of basic pay", () => {
    const totals = calculatePayslip(
      payslip({
        earnings: [{ id: "e", label: "HRA", mode: "basic", value: "40" }],
        deductions: [],
      }),
    );
    expect(totals.gross.toString()).toBe("140000");
  });

  it("counts employer contributions only when shown, without changing net pay", () => {
    const withEmployer = payslip({
      showEmployerContributions: true,
      employerContributions: [{ id: "x", label: "EPF employer", mode: "basic", value: "12" }],
    });
    expect(calculatePayslip(withEmployer).totalEmployer.toString()).toBe("12000");
    expect(calculatePayslip(withEmployer).net.toString()).toBe("104499.5");
    expect(
      calculatePayslip({
        ...withEmployer,
        showEmployerContributions: false,
      }).totalEmployer.toString(),
    ).toBe("0");
  });

  it("ignores empty and negative values", () => {
    const totals = calculatePayslip(
      payslip({
        earnings: [{ id: "e", label: "Bonus", mode: "amount", value: "-50" }],
        deductions: [],
      }),
    );
    expect(totals.gross.toString()).toBe("100000");
  });
});

describe("amounts in words", () => {
  it("writes whole numbers", () => {
    expect(numberToWords(0n)).toBe("Zero");
    expect(numberToWords(15n)).toBe("Fifteen");
    expect(numberToWords(40n)).toBe("Forty");
    expect(numberToWords(1234n)).toBe("One Thousand Two Hundred Thirty-Four");
    expect(numberToWords(2_000_005n)).toBe("Two Million Five");
  });

  it("uses lakh and crore for South Asian currencies", () => {
    expect(numberToWords(150_000n, "south-asian")).toBe("One Lakh Fifty Thousand");
    expect(numberToWords(12_500_000n, "south-asian")).toBe("One Crore Twenty-Five Lakh");
    expect(amountInWords(new Decimal("104499.5"), "LKR")).toBe(
      "LKR One Lakh Four Thousand Four Hundred Ninety-Nine and 50/100 Only",
    );
  });

  it("writes cents as a fraction and skips them when there are none", () => {
    expect(amountInWords(new Decimal("1500000.05"), "USD")).toBe(
      "USD One Million Five Hundred Thousand and 05/100 Only",
    );
    expect(amountInWords(new Decimal("2500"), "GBP")).toBe("GBP Two Thousand Five Hundred Only");
    expect(amountInWords(new Decimal("1200"), "JPY")).toBe("JPY One Thousand Two Hundred Only");
  });
});

describe("money formatting", () => {
  it("groups rupees the Indian way", () => {
    expect(formatMoney("150000", "INR")).toBe("₹1,50,000.00");
  });

  it("falls back to the currency code where the PDF font has no symbol", () => {
    expect(formatMoneyForPdf("150000", "INR")).toBe("INR 1,50,000.00");
    expect(formatMoneyForPdf("1234.5", "USD")).toBe("$1,234.50");
  });
});

describe("presets", () => {
  it("adds Sri Lankan EPF and ETF once and drops blank lines", () => {
    const start = createDefaultPayslip();
    start.deductions.push({ id: "blank", label: " ", mode: "amount", value: "" });
    const lk = COUNTRY_PRESETS.find((preset) => preset.id === "lk")!;
    const once = applyPreset(start, lk);
    expect(once.deductions.map((line) => line.label)).toEqual(["Income tax", "EPF – employee"]);
    expect(once.employerContributions).toHaveLength(2);
    expect(once.showEmployerContributions).toBe(true);
    const twice = applyPreset(once, lk);
    expect(twice.deductions).toHaveLength(2);
    expect(twice.employerContributions).toHaveLength(2);
  });
});

describe("next payslip", () => {
  it("moves a monthly payslip on by one month", () => {
    const next = nextPayslip(
      payslip({ payMonth: "2026-12", payDate: "2026-12-31", slipNumber: "PS-009" }),
    );
    expect(next.payMonth).toBe("2027-01");
    expect(next.payDate).toBe("2027-01-31");
    expect(next.slipNumber).toBe("PS-010");
  });

  it("keeps the pay day, clamped to short months", () => {
    expect(nextPayslip(payslip({ payMonth: "2027-01", payDate: "2027-01-30" })).payDate).toBe(
      "2027-02-28",
    );
    expect(nextPayslip(payslip({ payMonth: "2026-11", payDate: "2026-11-25" })).payDate).toBe(
      "2026-12-25",
    );
  });

  it("moves date ranges by their own length", () => {
    const weekly = nextPayslip(
      payslip({
        periodMode: "dates",
        periodStart: "2026-11-02",
        periodEnd: "2026-11-08",
        payDate: "2026-11-09",
      }),
    );
    expect([weekly.periodStart, weekly.periodEnd, weekly.payDate]).toEqual([
      "2026-11-09",
      "2026-11-15",
      "2026-11-16",
    ]);
    const month = nextPayslip(
      payslip({
        periodMode: "dates",
        periodStart: "2027-01-01",
        periodEnd: "2027-01-31",
        payDate: "2027-01-31",
      }),
    );
    expect([month.periodStart, month.periodEnd, month.payDate]).toEqual([
      "2027-02-01",
      "2027-02-28",
      "2027-02-28",
    ]);
  });

  it("increments numbers and leaves text without numbers", () => {
    expect(incrementNumber("2026/11/0099")).toBe("2026/11/0100");
    expect(incrementNumber("PS-7A")).toBe("PS-8A");
    expect(incrementNumber("")).toBe("");
  });
});

describe("validation", () => {
  it("accepts a complete payslip", () => {
    expect(validatePayslip(payslip())).toBeNull();
  });

  it("needs the company, employee and basic salary", () => {
    expect(validatePayslip(payslip({ company: { ...payslip().company, name: "" } }))).toContain(
      "company",
    );
    expect(validatePayslip(payslip({ employee: { ...payslip().employee, name: " " } }))).toContain(
      "employee",
    );
    expect(validatePayslip(payslip({ basicSalary: "" }))).toContain("basic salary");
  });

  it("rejects bad lines, percentages over 100 and negative net pay", () => {
    expect(
      validatePayslip(
        payslip({ deductions: [{ id: "d", label: "", mode: "amount", value: "5" }] }),
      ),
    ).toContain("name");
    expect(
      validatePayslip(
        payslip({ deductions: [{ id: "d", label: "X", mode: "basic", value: "120" }] }),
      ),
    ).toContain("100%");
    expect(
      validatePayslip(
        payslip({ deductions: [{ id: "d", label: "X", mode: "amount", value: "999999" }] }),
      ),
    ).toContain("more than the gross pay");
  });

  it("rejects a period that ends before it starts", () => {
    expect(
      validatePayslip(
        payslip({ periodMode: "dates", periodStart: "2026-11-10", periodEnd: "2026-11-01" }),
      ),
    ).toContain("cannot end before");
  });
});

describe("display helpers", () => {
  it("masks account numbers and labels the period", () => {
    expect(maskAccountNumber("0012 3456 789")).toBe("•••• 6789");
    expect(maskAccountNumber("123")).toBe("123");
    expect(periodLabel(payslip({ payMonth: "2026-11" }))).toBe("November 2026");
  });

  it("builds a safe file name", () => {
    expect(payslipFileName(payslip({ payMonth: "2026-11" }))).toBe(
      "payslip-Nimal-Perera-2026-11.pdf",
    );
  });

  it("picks a currency from the browser language", () => {
    expect(defaultCurrency(["si-LK"])).toBe("LKR");
    expect(defaultCurrency(["en-IN", "en"])).toBe("INR");
    expect(defaultCurrency(["xx"])).toBe("USD");
  });
});
