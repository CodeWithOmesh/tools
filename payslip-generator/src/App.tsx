import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarPlus,
  Check,
  ImagePlus,
  LoaderCircle,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { companyLines, detailRows, payslipFileName, pdfText, periodLabel } from "./format";
import {
  amountInWords,
  calculatePayslip,
  formatMoney,
  isPdfSafeText,
  lineBasis,
  type LineAmount,
} from "./money";
import {
  applyPreset,
  COUNTRY_PRESETS,
  createDefaultPayslip,
  DRAFT_KEY,
  makeId,
  monthEnd,
  nextPayslip,
  validatePayslip,
  type Company,
  type Employee,
  type LineMode,
  type PayLine,
  type Payslip,
} from "./types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const currencyCodes = [
  "AED",
  "AUD",
  "BDT",
  "BHD",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "DKK",
  "EGP",
  "EUR",
  "GBP",
  "GHS",
  "HKD",
  "IDR",
  "ILS",
  "INR",
  "JPY",
  "KES",
  "KWD",
  "LKR",
  "MAD",
  "MUR",
  "MVR",
  "MXN",
  "MYR",
  "NGN",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PHP",
  "PKR",
  "PLN",
  "QAR",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TZS",
  "UGX",
  "USD",
  "VND",
  "ZAR",
];

const currencyName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code;
  } catch {
    return code;
  }
};

const EARNING_SUGGESTIONS = [
  "Overtime",
  "Bonus",
  "Commission",
  "Housing allowance",
  "Meal allowance",
  "Mobile allowance",
];
const DEDUCTION_SUGGESTIONS = [
  "Loan repayment",
  "Salary advance",
  "No-pay leave",
  "Insurance",
  "Welfare",
];

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "numeric" | "email" | "tel";
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function CheckCard({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="check-card">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <b>{title}</b>
        <small>{hint}</small>
      </span>
    </label>
  );
}

function SectionTitle({ number, title, hint }: { number: string; title: string; hint: string }) {
  return (
    <div className="section-title">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{hint}</p>
      </div>
    </div>
  );
}

function CompanyFields({ value, onChange }: { value: Company; onChange: (next: Company) => void }) {
  const [logoError, setLogoError] = useState("");
  const patch = (key: keyof Company, next: string) => onChange({ ...value, [key]: next });
  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLogoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Use a PNG, JPG or WebP image for the logo.");
      return;
    }
    if (file.size > 1_500_000) {
      setLogoError("Choose a logo smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch("logoDataUrl", String(reader.result || ""));
    reader.onerror = () => setLogoError("This image could not be read. Try another file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="party-form">
      <div className="subhead">
        <h3>Company</h3>
        <label className="logo-upload">
          <ImagePlus size={14} />
          {value.logoDataUrl ? "Change logo" : "Add logo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={uploadLogo}
            hidden
          />
        </label>
      </div>
      {logoError ? (
        <p className="field-error" role="alert">
          {logoError}
        </p>
      ) : null}
      {value.logoDataUrl ? (
        <div className="logo-row">
          <img src={value.logoDataUrl} alt="Company logo" />
          <button type="button" className="text-button" onClick={() => patch("logoDataUrl", "")}>
            Remove logo
          </button>
        </div>
      ) : null}
      <TextInput
        label="Company / employer name"
        value={value.name}
        onChange={(v) => patch("name", v)}
        placeholder="Your company name"
      />
      <TextInput
        label="Address"
        value={value.address}
        onChange={(v) => patch("address", v)}
        placeholder="Street, city, country"
      />
      <div className="form-grid">
        <TextInput
          label="Email (optional)"
          type="email"
          value={value.email}
          onChange={(v) => patch("email", v)}
          placeholder="hr@example.com"
        />
        <TextInput
          label="Phone (optional)"
          value={value.phone}
          onChange={(v) => patch("phone", v)}
          placeholder="+94 11 234 5678"
        />
      </div>
      <TextInput
        label="Registration no. (optional)"
        value={value.registration}
        onChange={(v) => patch("registration", v)}
        placeholder="Business or EPF registration number"
      />
    </div>
  );
}

function EmployeeFields({
  value,
  onChange,
}: {
  value: Employee;
  onChange: (next: Employee) => void;
}) {
  const patch = <K extends keyof Employee>(key: K, next: Employee[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <div className="party-form">
      <TextInput
        label="Employee name"
        value={value.name}
        onChange={(v) => patch("name", v)}
        placeholder="Full name"
      />
      <div className="form-grid">
        <TextInput
          label="Employee ID (optional)"
          value={value.employeeId}
          onChange={(v) => patch("employeeId", v)}
          placeholder="EMP-001"
        />
        <TextInput
          label="Designation (optional)"
          value={value.designation}
          onChange={(v) => patch("designation", v)}
          placeholder="Job title"
        />
        <TextInput
          label="Department (optional)"
          value={value.department}
          onChange={(v) => patch("department", v)}
          placeholder="Finance"
        />
        <TextInput
          label="Date joined (optional)"
          type="date"
          value={value.joinDate}
          onChange={(v) => patch("joinDate", v)}
        />
        <TextInput
          label="Tax / ID number (optional)"
          value={value.taxId}
          onChange={(v) => patch("taxId", v)}
          placeholder="TIN, NIC or PAN"
        />
        <div className="form-grid compact">
          <TextInput
            label="Working days"
            inputMode="decimal"
            value={value.workingDays}
            onChange={(v) => patch("workingDays", v)}
            placeholder="22"
          />
          <TextInput
            label="Days worked"
            inputMode="decimal"
            value={value.daysWorked}
            onChange={(v) => patch("daysWorked", v)}
            placeholder="21"
          />
        </div>
        <TextInput
          label="Bank (optional)"
          value={value.bankName}
          onChange={(v) => patch("bankName", v)}
          placeholder="Bank name and branch"
        />
        <TextInput
          label="Account number (optional)"
          value={value.accountNumber}
          onChange={(v) => patch("accountNumber", v)}
          placeholder="Salary account"
        />
      </div>
      {value.accountNumber.trim() ? (
        <label className="inline-check">
          <input
            type="checkbox"
            checked={value.maskAccount}
            onChange={(event) => patch("maskAccount", event.target.checked)}
          />
          Show only the last 4 digits of the account number
        </label>
      ) : null}
    </div>
  );
}

function LineEditor({
  lines,
  amounts,
  currency,
  allowGross,
  addLabel,
  suggestions,
  onChange,
}: {
  lines: PayLine[];
  amounts: LineAmount[];
  currency: string;
  allowGross: boolean;
  addLabel: string;
  suggestions: string[];
  onChange: (lines: PayLine[]) => void;
}) {
  const patchLine = (id: string, changes: Partial<PayLine>) =>
    onChange(lines.map((line) => (line.id === id ? { ...line, ...changes } : line)));
  const add = (label = "") =>
    onChange([...lines, { id: makeId(), label, mode: "amount", value: "" }]);
  const unused = suggestions.filter(
    (label) => !lines.some((line) => line.label.trim().toLowerCase() === label.toLowerCase()),
  );

  return (
    <>
      {lines.length ? (
        <div className="line-header" aria-hidden>
          <span>Name</span>
          <span>Worked out as</span>
          <span>Value</span>
          <span>Amount</span>
          <span />
        </div>
      ) : null}
      <div className="line-list">
        {lines.map((line, index) => (
          <div className="line-row" key={line.id}>
            <input
              className="line-label"
              aria-label="Name"
              value={line.label}
              placeholder="Name"
              onChange={(event) => patchLine(line.id, { label: event.target.value })}
            />
            <select
              className="line-mode"
              aria-label={`How ${line.label || "this line"} is worked out`}
              value={line.mode}
              onChange={(event) => patchLine(line.id, { mode: event.target.value as LineMode })}
            >
              <option value="amount">Fixed amount</option>
              <option value="basic">% of basic</option>
              {allowGross ? <option value="gross">% of gross</option> : null}
            </select>
            <div className="line-value">
              <input
                aria-label={
                  line.mode === "amount"
                    ? `${line.label || "Line"} amount`
                    : `${line.label || "Line"} percentage`
                }
                inputMode="decimal"
                value={line.value}
                placeholder="0"
                onChange={(event) => patchLine(line.id, { value: event.target.value })}
              />
              <i>{line.mode === "amount" ? currency : "%"}</i>
            </div>
            <span className="line-amount">
              {formatMoney(amounts[index]?.amount ?? 0, currency)}
            </span>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove ${line.label || "line"}`}
              title="Remove"
              onClick={() => onChange(lines.filter((item) => item.id !== line.id))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="add-row">
        <button type="button" className="add-item" onClick={() => add()}>
          <Plus size={15} /> {addLabel}
        </button>
        {unused.slice(0, 4).map((label) => (
          <button key={label} type="button" className="chip" onClick={() => add(label)}>
            + {label}
          </button>
        ))}
      </div>
    </>
  );
}

function LineName({ item }: { item?: LineAmount }) {
  if (!item) return null;
  const basis = lineBasis(item.line);
  return (
    <>
      {item.line.label || "—"}
      {basis ? <small> ({basis})</small> : null}
    </>
  );
}

function PayslipPaper({ payslip }: { payslip: Payslip }) {
  const totals = calculatePayslip(payslip);
  const money = (value: LineAmount["amount"]) => formatMoney(value, payslip.currency);
  const earnings: LineAmount[] = [
    {
      line: { id: "basic", label: "Basic salary", mode: "amount", value: "" },
      amount: totals.basic,
    },
    ...totals.earnings,
  ];
  const rows = Math.max(earnings.length, totals.deductions.length);
  const details = detailRows(payslip);
  const period = periodLabel(payslip);

  return (
    <article className={`payslip-paper ${payslip.template}`}>
      <div className="paper-top">
        <div className="paper-seller">
          {payslip.company.logoDataUrl ? (
            <img src={payslip.company.logoDataUrl} alt="Company logo" className="paper-logo" />
          ) : null}
          <div>
            <strong>{payslip.company.name || "Company name"}</strong>
            {companyLines(payslip).map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        </div>
        <div className="paper-heading">
          <h2>PAYSLIP</h2>
          {period ? <span>{period}</span> : null}
          {payslip.slipNumber.trim() ? <small>No. {payslip.slipNumber.trim()}</small> : null}
        </div>
      </div>
      <div className="paper-accent" />

      <section className="paper-employee">
        <label>EMPLOYEE</label>
        <strong>{payslip.employee.name || "Employee name"}</strong>
        {details.length ? (
          <dl>
            {details.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <table className="pay-table">
        <thead>
          <tr>
            <th>Earnings</th>
            <th>Amount</th>
            <th className="split">Deductions</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => {
            const earning = earnings[index];
            const deduction = totals.deductions[index];
            return (
              <tr key={index}>
                <td>
                  <LineName item={earning} />
                </td>
                <td>{earning ? money(earning.amount) : ""}</td>
                <td className="split">
                  <LineName item={deduction} />
                </td>
                <td>{deduction ? money(deduction.amount) : ""}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Gross earnings</td>
            <td>{money(totals.gross)}</td>
            <td className="split">Total deductions</td>
            <td>{money(totals.totalDeductions)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="net-band">
        <div>
          <b>NET PAY</b>
          <small>Gross earnings minus total deductions</small>
        </div>
        <strong>{money(totals.net)}</strong>
      </div>
      {payslip.showInWords ? (
        <p className="net-words">{amountInWords(totals.net, payslip.currency)}</p>
      ) : null}

      {totals.employer.length ? (
        <section className="paper-employer">
          <label>EMPLOYER CONTRIBUTIONS (NOT DEDUCTED FROM PAY)</label>
          {totals.employer.map((item) => (
            <div key={item.line.id}>
              <span>
                <LineName item={item} />
              </span>
              <b>{money(item.amount)}</b>
            </div>
          ))}
          <div className="employer-total">
            <span>Total</span>
            <b>{money(totals.totalEmployer)}</b>
          </div>
        </section>
      ) : null}

      {payslip.notes.trim() ? (
        <section className="paper-notes">
          <label>NOTES</label>
          <p>{payslip.notes}</p>
        </section>
      ) : null}

      {payslip.showSignatures ? (
        <div className="signature-lines">
          <span>Employer signature</span>
          <span>Employee signature</span>
        </div>
      ) : null}
      {payslip.footer.trim() ? <div className="paper-footer">{payslip.footer}</div> : null}
    </article>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="https://codewithomesh.com">
        <img
          className="brand-mark"
          src={`${import.meta.env.BASE_URL}logo-icon.svg`}
          alt=""
          width={40}
          height={40}
        />
        <span className="brand-name">
          Code with <b>Omesh</b>
          <small>FREE ONLINE TOOLS</small>
        </span>
      </a>
      <div className="header-right">
        <span className="free-pill">
          <i />
          Free tool
        </span>
        <a href="https://codewithomesh.com/tools/" className="header-link">
          More tools <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}

function loadDraft(current: Payslip): Payslip {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return current;
    const draft = JSON.parse(raw) as Partial<Payslip>;
    const lines = (value: unknown, fallback: PayLine[]) =>
      Array.isArray(value)
        ? (value as PayLine[]).filter((line) => line && typeof line.id === "string")
        : fallback;
    return {
      ...current,
      ...draft,
      company: { ...current.company, ...draft.company },
      employee: { ...current.employee, ...draft.employee },
      earnings: lines(draft.earnings, current.earnings),
      deductions: lines(draft.deductions, current.deductions),
      employerContributions: lines(draft.employerContributions, current.employerContributions),
    };
  } catch {
    return current;
  }
}

export default function App() {
  const [payslip, setPayslip] = useState<Payslip>(() => createDefaultPayslip());
  const [hydrated, setHydrated] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [saved, setSaved] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const totals = useMemo(() => calculatePayslip(payslip), [payslip]);
  const patch = <K extends keyof Payslip>(key: K, value: Payslip[K]) =>
    setPayslip((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setPayslip((current) => loadDraft(current));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payslip));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [payslip, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const reset = () => {
    if (
      !window.confirm(
        "Start a new payslip? The company, employee and pay details saved in this browser will be cleared.",
      )
    )
      return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* Browser storage is optional (it can be blocked in private or locked-down browsers). */
    }
    setActionError("");
    setPayslip(createDefaultPayslip());
  };
  const nextPeriod = () => {
    const next = nextPayslip(payslip);
    setPayslip(next);
    setActionError("");
    setNotice(`Moved to ${periodLabel(next)}. Update any amounts that changed.`);
  };
  const checkPayslip = () => {
    const problem = validatePayslip(payslip);
    setActionError(problem ?? "");
    if (problem) setMobileTab("edit");
    return !problem;
  };
  const printPayslip = () => {
    if (checkPayslip()) window.print();
  };
  const downloadPdf = async () => {
    if (pdfBusy || !checkPayslip()) return;
    if (!pdfText(payslip).every(isPdfSafeText)) {
      setActionError(
        "Some text uses letters the PDF font cannot show (for example Sinhala, Tamil or Hindi). Use “Print payslip” and choose “Save as PDF” instead.",
      );
      return;
    }
    setPdfBusy(true);
    try {
      const { createPayslipPdf } = await import("./pdf");
      const blob = await createPayslipPdf(payslip);
      downloadBlob(blob, payslipFileName(payslip));
    } catch {
      setActionError("The PDF could not be created. Please try again, or use Print instead.");
    } finally {
      setPdfBusy(false);
    }
  };

  const setPeriodMode = (mode: Payslip["periodMode"]) =>
    setPayslip((current) => {
      if (mode === current.periodMode) return current;
      // Start the date range from the chosen month, so switching does not lose the period.
      if (mode === "dates" && /^\d{4}-\d{2}$/.test(current.payMonth)) {
        return {
          ...current,
          periodMode: mode,
          periodStart: `${current.payMonth}-01`,
          periodEnd: monthEnd(current.payMonth),
        };
      }
      return { ...current, periodMode: mode };
    });

  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="intro">
          <div className="intro-kicker">
            <Sparkles size={14} /> SIMPLE, ACCURATE & FREE
          </div>
          <h1>
            Free online <span>payslip generator</span>
          </h1>
          <p>
            Make a clear salary slip in minutes. Add the employee, earnings and deductions such as
            EPF or PF, and the net pay is worked out for you. Then download or print the payslip as
            a PDF.
          </p>
          <div className="trust-row">
            <span>
              <Check size={14} /> No sign-up
            </span>
            <span>
              <Check size={14} /> EPF, ETF & PF presets
            </span>
            <span>
              <Check size={14} /> Salary details stay on your device
            </span>
          </div>
        </section>

        <div className="mobile-switch" role="tablist" aria-label="Payslip editor view">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "edit"}
            className={mobileTab === "edit" ? "selected" : ""}
            onClick={() => setMobileTab("edit")}
          >
            Edit payslip
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "preview"}
            className={mobileTab === "preview" ? "selected" : ""}
            onClick={() => setMobileTab("preview")}
          >
            Live preview
          </button>
        </div>

        <div className="workspace">
          <section className={`editor-column ${mobileTab === "edit" ? "mobile-active" : ""}`}>
            <div className="column-heading">
              <div>
                <i>01</i>
                <h2>Payslip details</h2>
              </div>
              <span className="saved-indicator">
                {saved && hydrated ? (
                  <>
                    <b /> Saved in this browser
                  </>
                ) : (
                  "Saving draft…"
                )}
              </span>
            </div>

            <div className="editor-card">
              <section className="form-section">
                <SectionTitle
                  number="01"
                  title="Pay period"
                  hint="Choose the period this payslip covers, the pay date and the currency."
                />
                <div
                  className="period-toggle template-options"
                  role="radiogroup"
                  aria-label="Pay period type"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={payslip.periodMode === "month"}
                    className={payslip.periodMode === "month" ? "active" : ""}
                    onClick={() => setPeriodMode("month")}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={payslip.periodMode === "dates"}
                    className={payslip.periodMode === "dates" ? "active" : ""}
                    onClick={() => setPeriodMode("dates")}
                  >
                    Custom dates
                  </button>
                </div>
                <div className="form-grid">
                  {payslip.periodMode === "month" ? (
                    <TextInput
                      label="Pay month"
                      type="month"
                      value={payslip.payMonth}
                      onChange={(v) => patch("payMonth", v)}
                    />
                  ) : (
                    <>
                      <TextInput
                        label="Period starts"
                        type="date"
                        value={payslip.periodStart}
                        onChange={(v) => patch("periodStart", v)}
                      />
                      <TextInput
                        label="Period ends"
                        type="date"
                        value={payslip.periodEnd}
                        onChange={(v) => patch("periodEnd", v)}
                      />
                    </>
                  )}
                  <TextInput
                    label="Pay date"
                    type="date"
                    value={payslip.payDate}
                    onChange={(v) => patch("payDate", v)}
                  />
                  <Field label="Currency">
                    <select
                      value={payslip.currency}
                      onChange={(e) => patch("currency", e.target.value)}
                    >
                      {currencyCodes.map((code) => (
                        <option key={code} value={code}>
                          {code} — {currencyName(code)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <TextInput
                    label="Payslip number (optional)"
                    value={payslip.slipNumber}
                    onChange={(v) => patch("slipNumber", v)}
                    placeholder="PS-2026-001"
                  />
                </div>
                <div className="template-row">
                  <span>Payslip style</span>
                  <div className="template-options">
                    <button
                      type="button"
                      className={payslip.template === "simple" ? "active" : ""}
                      onClick={() => patch("template", "simple")}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      className={payslip.template === "professional" ? "active" : ""}
                      onClick={() => patch("template", "professional")}
                    >
                      Professional
                    </button>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <SectionTitle
                  number="02"
                  title="Company & employee"
                  hint="Who is paying, and who is being paid."
                />
                <CompanyFields value={payslip.company} onChange={(v) => patch("company", v)} />
                <div className="section-divider" />
                <div className="subhead">
                  <h3>Employee</h3>
                </div>
                <EmployeeFields value={payslip.employee} onChange={(v) => patch("employee", v)} />
              </section>

              <section className="form-section">
                <SectionTitle
                  number="03"
                  title="Earnings"
                  hint="The basic salary plus allowances, overtime and bonuses."
                />
                <TextInput
                  label={`Basic salary (${payslip.currency})`}
                  inputMode="decimal"
                  value={payslip.basicSalary}
                  onChange={(v) => patch("basicSalary", v)}
                  placeholder="0.00"
                  className="basic-field"
                />
                <LineEditor
                  lines={payslip.earnings}
                  amounts={totals.earnings}
                  currency={payslip.currency}
                  allowGross={false}
                  addLabel="Add earning"
                  suggestions={EARNING_SUGGESTIONS}
                  onChange={(lines) => patch("earnings", lines)}
                />
              </section>

              <section className="form-section">
                <SectionTitle
                  number="04"
                  title="Deductions"
                  hint="Tax, provident fund, loans and anything else taken from pay."
                />
                <div className="preset-row">
                  <span>Add typical contributions:</span>
                  {COUNTRY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="chip"
                      onClick={() => setPayslip((current) => applyPreset(current, preset))}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <LineEditor
                  lines={payslip.deductions}
                  amounts={totals.deductions}
                  currency={payslip.currency}
                  allowGross
                  addLabel="Add deduction"
                  suggestions={DEDUCTION_SUGGESTIONS}
                  onChange={(lines) => patch("deductions", lines)}
                />
                <p className="field-hint">
                  Preset rates are common defaults. Check them against current rules and change the
                  base (basic or gross) if your company calculates them differently.
                </p>
                <div className="totals-editor">
                  <div>
                    <span>Gross earnings</span>
                    <b>{formatMoney(totals.gross, payslip.currency)}</b>
                  </div>
                  <div>
                    <span>Total deductions</span>
                    <b>-{formatMoney(totals.totalDeductions, payslip.currency)}</b>
                  </div>
                  <div className={`grand-total ${totals.net.isNegative() ? "negative" : ""}`}>
                    <span>Net pay</span>
                    <b>{formatMoney(totals.net, payslip.currency)}</b>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <SectionTitle
                  number="05"
                  title="Employer contributions"
                  hint="Optional. Shown for information and not taken from the employee’s pay."
                />
                <CheckCard
                  checked={payslip.showEmployerContributions}
                  onChange={(v) => patch("showEmployerContributions", v)}
                  title="Show employer contributions"
                  hint="For example EPF 12% and ETF 3% in Sri Lanka, or the employer’s PF share in India."
                />
                {payslip.showEmployerContributions ? (
                  <div className="employer-editor">
                    <LineEditor
                      lines={payslip.employerContributions}
                      amounts={totals.employer}
                      currency={payslip.currency}
                      allowGross
                      addLabel="Add contribution"
                      suggestions={[]}
                      onChange={(lines) => patch("employerContributions", lines)}
                    />
                  </div>
                ) : null}
              </section>

              <section className="form-section">
                <SectionTitle
                  number="06"
                  title="Notes & signatures"
                  hint="Optional extras that appear on the payslip."
                />
                <TextArea
                  label="Notes"
                  value={payslip.notes}
                  onChange={(v) => patch("notes", v)}
                  placeholder="Leave balance, salary changes or other information"
                />
                <TextInput
                  label="Footer message"
                  value={payslip.footer}
                  onChange={(v) => patch("footer", v)}
                  placeholder="This is a computer-generated payslip."
                />
                <CheckCard
                  checked={payslip.showInWords}
                  onChange={(v) => patch("showInWords", v)}
                  title="Show net pay in words"
                  hint="For example “LKR One Lakh Five Thousand Only”."
                />
                <CheckCard
                  checked={payslip.showSignatures}
                  onChange={(v) => patch("showSignatures", v)}
                  title="Add signature lines"
                  hint="Blank lines for the employer and employee to sign a printed copy."
                />
              </section>

              <div className="editor-footer">
                <span>
                  <ShieldCheck size={15} /> Salary details stay in this browser.
                </span>
                <div className="footer-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={nextPeriod}
                    title="Keep the company, employee and pay lines, and move to the next period"
                  >
                    <CalendarPlus size={14} /> Next pay period
                  </button>
                  <button type="button" className="text-button" onClick={reset}>
                    <RotateCcw size={14} /> New payslip
                  </button>
                </div>
              </div>
              {notice ? (
                <p className="notice" role="status">
                  {notice}
                </p>
              ) : null}
            </div>
          </section>

          <aside className={`preview-column ${mobileTab === "preview" ? "mobile-active" : ""}`}>
            <div className="column-heading">
              <div>
                <i>02</i>
                <h2>Live preview</h2>
              </div>
              <span className="live-pill">
                <b /> LIVE
              </span>
            </div>
            <div className="preview-stage">
              <PayslipPaper payslip={payslip} />
            </div>
            {actionError ? (
              <p className="action-error" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="action-bar">
              <button
                type="button"
                className="download-button"
                onClick={() => void downloadPdf()}
                disabled={pdfBusy}
              >
                {pdfBusy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <ArrowDownToLine size={16} />
                )}
                {pdfBusy ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button type="button" className="print-button" onClick={printPayslip}>
                <Printer size={16} /> Print payslip
              </button>
            </div>
            <div className="preview-security">
              <ShieldCheck size={15} /> Private by design. Nothing is uploaded.
            </div>
            <div className="quick-totals">
              <span>Net pay</span>
              <strong>{formatMoney(totals.net, payslip.currency)}</strong>
            </div>
          </aside>
        </div>

        <section className="below-content">
          <div className="below-intro">
            <span className="eyebrow">MADE FOR SMALL BUSINESSES, STARTUPS & HR</span>
            <h2>Payslips your team can understand</h2>
            <p>
              Show every earning and deduction clearly, without payroll software or a subscription.
            </p>
          </div>
          <div className="benefits">
            <article>
              <i>
                <ReceiptText size={19} />
              </i>
              <h3>Clear breakdown</h3>
              <p>
                Earnings and deductions side by side, with gross pay, net pay and the amount in
                words.
              </p>
            </article>
            <article>
              <i>
                <Wallet size={19} />
              </i>
              <h3>Percentages worked out</h3>
              <p>
                Set EPF, ETF, PF or any other line as a percentage of basic or gross pay, and it is
                calculated with exact rounding.
              </p>
            </article>
            <article>
              <i>
                <ShieldCheck size={19} />
              </i>
              <h3>Private by design</h3>
              <p>
                Salary and bank details never leave your device. The draft is kept only in this
                browser.
              </p>
            </article>
          </div>
          <div className="faq">
            <h2>Frequently asked questions</h2>
            <details>
              <summary>Is this payslip generator free?</summary>
              <p>
                Yes. You can create, download and print as many payslips as you need, with no
                sign-up.
              </p>
            </details>
            <details>
              <summary>Is the salary information uploaded anywhere?</summary>
              <p>
                No. The payslip is made in your browser. A draft is saved in this browser so you can
                continue later. Use “New payslip” to clear it, especially on a shared computer.
              </p>
            </details>
            <details>
              <summary>How are EPF and ETF worked out for Sri Lanka?</summary>
              <p>
                The Sri Lanka preset adds EPF at 8% from the employee, and EPF at 12% and ETF at 3%
                paid by the employer, all based on the basic salary. If your company includes some
                allowances, change the line to a percentage of gross pay or type the amount.
              </p>
            </details>
            <details>
              <summary>Can I make payslips for every month quickly?</summary>
              <p>
                Yes. After saving one payslip, press “Next pay period”. The company, employee and
                pay lines stay the same, the period moves on, and the payslip number goes up by one.
              </p>
            </details>
            <details>
              <summary>Does it calculate income tax (PAYE, APIT or TDS)?</summary>
              <p>
                No. Tax rules change often and depend on each person, so type the tax amount from
                your tax tables or payroll provider as a fixed deduction.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Code with Omesh</span>
        <span>Useful tools. Simple solutions.</span>
        <a href="https://codewithomesh.com">
          codewithomesh.com <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
