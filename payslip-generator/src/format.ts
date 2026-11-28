// Text shown on both the on-screen payslip and the PDF.
import type { Payslip } from "./types";

export function dateLabel(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return "";
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
  });
}

export function periodLabel(payslip: Payslip): string {
  if (payslip.periodMode === "month") return monthLabel(payslip.payMonth);
  const start = dateLabel(payslip.periodStart);
  const end = dateLabel(payslip.periodEnd);
  return start && end ? `${start} – ${end}` : start || end;
}

/** "123456789" → "•••• 6789". Short numbers are left as they are. */
export function maskAccountNumber(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return value.trim();
  return `•••• ${compact.slice(-4)}`;
}

export interface DetailRow {
  label: string;
  value: string;
}

/** Employee and pay details, leaving out anything that was not filled in. */
export function detailRows(payslip: Payslip): DetailRow[] {
  const { employee } = payslip;
  const account = employee.maskAccount
    ? maskAccountNumber(employee.accountNumber)
    : employee.accountNumber.trim();
  const days =
    employee.daysWorked.trim() && employee.workingDays.trim()
      ? `${employee.daysWorked.trim()} of ${employee.workingDays.trim()}`
      : employee.daysWorked.trim() || employee.workingDays.trim();
  const rows: DetailRow[] = [
    { label: "Employee ID", value: employee.employeeId },
    { label: "Designation", value: employee.designation },
    { label: "Department", value: employee.department },
    { label: "Date joined", value: dateLabel(employee.joinDate) },
    { label: "Tax / ID no.", value: employee.taxId },
    { label: "Pay period", value: periodLabel(payslip) },
    { label: "Pay date", value: dateLabel(payslip.payDate) },
    { label: employee.daysWorked.trim() ? "Days worked" : "Working days", value: days },
    { label: "Bank", value: employee.bankName },
    { label: "Account no.", value: account },
  ];
  return rows.map((row) => ({ ...row, value: row.value.trim() })).filter((row) => row.value);
}

export function companyLines(payslip: Payslip): string[] {
  const { company } = payslip;
  return [
    company.address,
    [company.email, company.phone].filter((part) => part.trim()).join("  ·  "),
    company.registration ? `Reg. no. ${company.registration}` : "",
  ]
    .map((line) => line.trim())
    .filter(Boolean);
}

export function payslipFileName(payslip: Payslip): string {
  const period =
    payslip.periodMode === "month" ? payslip.payMonth : payslip.periodStart || payslip.payDate;
  const name = payslip.employee.name
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${["payslip", name, period].filter(Boolean).join("-")}.pdf`;
}

/** Every piece of text the PDF draws, for checking it can be drawn with the built-in font. */
export function pdfText(payslip: Payslip): string[] {
  const lines = [...payslip.earnings, ...payslip.deductions];
  if (payslip.showEmployerContributions) lines.push(...payslip.employerContributions);
  return [
    payslip.slipNumber,
    payslip.company.name,
    ...companyLines(payslip),
    payslip.employee.name,
    ...detailRows(payslip).map((row) => row.value),
    ...lines.map((line) => line.label),
    payslip.notes,
    payslip.footer,
  ];
}
