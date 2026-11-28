import { calculatePayslip } from "./money";

export type PayslipTemplate = "simple" | "professional";
export type PeriodMode = "month" | "dates";

/** How a line's amount is worked out: a fixed amount, or a percentage of basic or gross pay. */
export type LineMode = "amount" | "basic" | "gross";

export interface PayLine {
  id: string;
  label: string;
  mode: LineMode;
  /** The amount, or the percentage when `mode` is "basic" or "gross". */
  value: string;
}

export interface Company {
  name: string;
  address: string;
  email: string;
  phone: string;
  registration: string;
  logoDataUrl: string;
}

export interface Employee {
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  joinDate: string;
  taxId: string;
  bankName: string;
  accountNumber: string;
  /** Show only the last four digits of the account number on the payslip. */
  maskAccount: boolean;
  workingDays: string;
  daysWorked: string;
}

export interface Payslip {
  slipNumber: string;
  currency: string;
  template: PayslipTemplate;
  periodMode: PeriodMode;
  /** "YYYY-MM", used when `periodMode` is "month". */
  payMonth: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  company: Company;
  employee: Employee;
  basicSalary: string;
  earnings: PayLine[];
  deductions: PayLine[];
  showEmployerContributions: boolean;
  employerContributions: PayLine[];
  showInWords: boolean;
  showSignatures: boolean;
  notes: string;
  footer: string;
}

export const DRAFT_KEY = "cwo-payslip-draft-v1";

export function makeId(prefix = "line"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The last day of a "YYYY-MM" month as "YYYY-MM-DD". */
export function monthEnd(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return "";
  return localDate(new Date(year, monthNumber, 0));
}

const REGION_CURRENCIES: Record<string, string> = {
  LK: "LKR",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  NP: "NPR",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  CA: "CAD",
  SG: "SGD",
  MY: "MYR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  PH: "PHP",
};

/** A sensible starting currency from the browser's language setting, e.g. en-LK → LKR. */
export function defaultCurrency(
  languages: readonly string[] = globalThis.navigator?.languages ?? [],
): string {
  for (const language of languages) {
    try {
      const region = new Intl.Locale(language).maximize().region;
      if (region && REGION_CURRENCIES[region]) return REGION_CURRENCIES[region];
    } catch {
      // Ignore malformed language tags.
    }
  }
  return "USD";
}

export function createDefaultPayslip(today = new Date()): Payslip {
  const payMonth = localDate(today).slice(0, 7);
  return {
    slipNumber: "",
    currency: defaultCurrency(),
    template: "professional",
    periodMode: "month",
    payMonth,
    periodStart: `${payMonth}-01`,
    periodEnd: monthEnd(payMonth),
    payDate: monthEnd(payMonth),
    company: { name: "", address: "", email: "", phone: "", registration: "", logoDataUrl: "" },
    employee: {
      name: "",
      employeeId: "",
      designation: "",
      department: "",
      joinDate: "",
      taxId: "",
      bankName: "",
      accountNumber: "",
      maskAccount: true,
      workingDays: "",
      daysWorked: "",
    },
    basicSalary: "",
    earnings: [{ id: "earning-1", label: "Transport allowance", mode: "amount", value: "" }],
    deductions: [{ id: "deduction-1", label: "Income tax", mode: "amount", value: "" }],
    showEmployerContributions: false,
    employerContributions: [],
    showInWords: true,
    showSignatures: false,
    notes: "",
    footer: "",
  };
}

export interface LinePreset {
  label: string;
  mode: LineMode;
  value: string;
}

export interface CountryPreset {
  id: string;
  label: string;
  deductions: LinePreset[];
  employer: LinePreset[];
}

/** Common statutory contributions. Rates are typical defaults and can be edited. */
export const COUNTRY_PRESETS: CountryPreset[] = [
  {
    id: "lk",
    label: "Sri Lanka (EPF / ETF)",
    deductions: [{ label: "EPF – employee", mode: "basic", value: "8" }],
    employer: [
      { label: "EPF – employer", mode: "basic", value: "12" },
      { label: "ETF – employer", mode: "basic", value: "3" },
    ],
  },
  {
    id: "in",
    label: "India (PF)",
    deductions: [{ label: "Provident fund – employee", mode: "basic", value: "12" }],
    employer: [{ label: "Provident fund – employer", mode: "basic", value: "12" }],
  },
];

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Adds preset lines that are not already on the payslip (matched by label). */
export function applyPreset(payslip: Payslip, preset: CountryPreset): Payslip {
  const merge = (lines: PayLine[], additions: LinePreset[], prefix: string) => [
    // An untouched, empty starter line is replaced rather than kept beside the preset.
    ...lines.filter((line) => line.label.trim() || line.value.trim()),
    ...additions
      .filter((addition) => !lines.some((line) => sameLabel(line.label, addition.label)))
      .map((addition) => ({ id: makeId(prefix), ...addition })),
  ];
  return {
    ...payslip,
    deductions: merge(payslip.deductions, preset.deductions, "deduction"),
    employerContributions: merge(payslip.employerContributions, preset.employer, "employer"),
    showEmployerContributions: payslip.showEmployerContributions || preset.employer.length > 0,
  };
}

function shiftMonth(month: string, by: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(year, monthNumber - 1 + by, 1);
  return localDate(date).slice(0, 7);
}

function addDays(value: string, days: number): string {
  if (!value) return value;
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

/** Moves a date one month on, keeping month-end dates at the month end. */
function nextMonthDate(value: string): string {
  if (!value) return value;
  const month = value.slice(0, 7);
  const next = shiftMonth(month, 1);
  if (value === monthEnd(month)) return monthEnd(next);
  const day = Math.min(Number(value.slice(8, 10)), Number(monthEnd(next).slice(8, 10)));
  return `${next}-${String(day).padStart(2, "0")}`;
}

/** Increases the last number in a payslip number, keeping its zero padding: PS-009 → PS-010. */
export function incrementNumber(value: string): string {
  const match = /(\d+)(\D*)$/.exec(value);
  if (!match) return value;
  const next = String(Number(match[1]) + 1).padStart(match[1].length, "0");
  return `${value.slice(0, match.index)}${next}${match[2]}`;
}

/** The same payslip for the following pay period, keeping the company, employee and pay lines. */
export function nextPayslip(payslip: Payslip): Payslip {
  const result: Payslip = {
    ...payslip,
    slipNumber: incrementNumber(payslip.slipNumber),
    payDate: nextMonthDate(payslip.payDate),
  };
  if (payslip.periodMode === "month") {
    result.payMonth = shiftMonth(payslip.payMonth, 1);
  } else if (payslip.periodStart && payslip.periodEnd) {
    const start = new Date(`${payslip.periodStart}T00:00:00`);
    const end = new Date(`${payslip.periodEnd}T00:00:00`);
    const startIsFirst = start.getDate() === 1;
    const endIsLast = payslip.periodEnd === monthEnd(payslip.periodEnd.slice(0, 7));
    if (startIsFirst && endIsLast) {
      // A whole-month range stays a whole-month range.
      result.periodStart = `${shiftMonth(payslip.periodStart.slice(0, 7), 1)}-01`;
      result.periodEnd = monthEnd(shiftMonth(payslip.periodEnd.slice(0, 7), 1));
    } else {
      const length = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      result.periodStart = addDays(payslip.periodEnd, 1);
      result.periodEnd = addDays(payslip.periodEnd, length);
      result.payDate = payslip.payDate ? addDays(payslip.payDate, length) : payslip.payDate;
    }
  }
  return result;
}

function isNonNegativeNumber(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
}

function lineProblem(line: PayLine, group: string): string | null {
  if (!line.label.trim()) return `Enter a name for every ${group} line, or remove empty lines.`;
  const value = line.value.trim();
  if (value !== "" && !isNonNegativeNumber(value))
    return `“${line.label.trim()}” must be zero or a positive number.`;
  if (line.mode !== "amount" && Number(value) > 100)
    return `“${line.label.trim()}” cannot be more than 100%.`;
  return null;
}

/** Returns the first problem that should stop the payslip being exported, or null. */
export function validatePayslip(payslip: Payslip): string | null {
  if (!payslip.company.name.trim()) return "Enter the company or employer name.";
  if (!payslip.employee.name.trim()) return "Enter the employee’s name.";
  if (payslip.periodMode === "month") {
    if (!/^\d{4}-\d{2}$/.test(payslip.payMonth)) return "Choose the month this payslip is for.";
  } else {
    if (!payslip.periodStart || !payslip.periodEnd)
      return "Choose the pay period start and end dates.";
    if (payslip.periodEnd < payslip.periodStart)
      return "The pay period cannot end before it starts.";
  }
  if (!isNonNegativeNumber(payslip.basicSalary)) return "Enter the basic salary.";
  for (const line of payslip.earnings) {
    const problem = lineProblem(line, "earnings");
    if (problem) return problem;
  }
  for (const line of payslip.deductions) {
    const problem = lineProblem(line, "deduction");
    if (problem) return problem;
  }
  if (payslip.showEmployerContributions) {
    for (const line of payslip.employerContributions) {
      const problem = lineProblem(line, "employer contribution");
      if (problem) return problem;
    }
  }
  for (const [label, value] of [
    ["Working days", payslip.employee.workingDays],
    ["Days worked", payslip.employee.daysWorked],
  ] as const) {
    if (value.trim() && !isNonNegativeNumber(value)) return `${label} must be a number.`;
  }
  if (calculatePayslip(payslip).net.isNegative())
    return "Total deductions are more than the gross pay. Check the deduction amounts.";
  return null;
}
