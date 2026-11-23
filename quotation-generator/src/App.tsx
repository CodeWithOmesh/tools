import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpRight,
  Check,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { calculateQuotation, decimal, formatMoney } from "./money";
import {
  createDefaultQuotation,
  DRAFT_KEY,
  validateQuotation,
  type PartyDetails,
  type Quotation,
  type QuotationItem,
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
  "AED", "AUD", "BDT", "BHD", "BRL", "CAD", "CHF", "CNY", "DKK", "EGP", "EUR", "GBP",
  "HKD", "IDR", "ILS", "INR", "IQD", "JPY", "KES", "KRW", "KWD", "LKR", "MAD", "MUR",
  "MXN", "MYR", "NGN", "NOK", "NPR", "NZD", "OMR", "PHP", "PKR", "PLN", "QAR", "RON",
  "SAR", "SEK", "SGD", "THB", "TRY", "TWD", "TZS", "UAH", "USD", "VND", "ZAR",
];
const makeId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
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

function PartyFields({
  title,
  value,
  onChange,
  onLogo,
}: {
  title: string;
  value: PartyDetails;
  onChange: (next: PartyDetails) => void;
  onLogo?: (data: string) => void;
}) {
  const [logoError, setLogoError] = useState("");
  const patch = (key: keyof PartyDetails, next: string) => onChange({ ...value, [key]: next });
  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLogoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Use a PNG, JPG or WebP image for your logo.");
      return;
    }
    if (file.size > 1_500_000) {
      setLogoError("Choose a logo smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onLogo?.(String(reader.result || ""));
    reader.onerror = () => setLogoError("This image could not be read. Try another file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="party-form">
      <div className="subhead">
        <h3>{title}</h3>
        {onLogo ? (
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
        ) : null}
      </div>
      {logoError ? (
        <p className="field-error" role="alert">
          {logoError}
        </p>
      ) : null}
      {onLogo && value.logoDataUrl ? (
        <div className="logo-row">
          <img src={value.logoDataUrl} alt="Business logo" />
          <button type="button" className="text-button" onClick={() => onLogo("")}>
            Remove logo
          </button>
        </div>
      ) : null}
      <TextInput
        label="Name / company"
        value={value.name}
        onChange={(v) => patch("name", v)}
        placeholder={title === "Your business" ? "Your business name" : "Client or company name"}
      />
      <div className="form-grid">
        <TextInput
          label="Email"
          type="email"
          value={value.email}
          onChange={(v) => patch("email", v)}
          placeholder="name@example.com"
        />
        <TextInput
          label="Phone"
          value={value.phone}
          onChange={(v) => patch("phone", v)}
          placeholder="+1 555 0100"
        />
      </div>
      <TextInput
        label="Address"
        value={value.address}
        onChange={(v) => patch("address", v)}
        placeholder="Street, city, country"
      />
      <TextInput
        label="Tax ID (optional)"
        value={value.taxId}
        onChange={(v) => patch("taxId", v)}
        placeholder="VAT / tax registration number"
      />
    </div>
  );
}

function QuotePaper({ quotation }: { quotation: Quotation }) {
  const totals = calculateQuotation(quotation);
  const date = (value: string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("en", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
  const partyLines = (party: PartyDetails) =>
    [party.address, party.email, party.phone, party.taxId ? `Tax ID: ${party.taxId}` : ""].filter(
      Boolean,
    );

  return (
    <article className={`quotation-paper ${quotation.template}`}>
      <div className="paper-top">
        <div className="paper-seller">
          {quotation.business.logoDataUrl ? (
            <img src={quotation.business.logoDataUrl} alt="Business logo" className="paper-logo" />
          ) : null}
          <div>
            <strong>{quotation.business.name || "Your business"}</strong>
            {partyLines(quotation.business).map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        </div>
        <div className="paper-heading">
          <h2>QUOTATION</h2>
          <span>#{quotation.quoteNumber || "—"}</span>
          <small>Issued {date(quotation.issueDate)}</small>
          <small>Valid until {date(quotation.validUntil)}</small>
        </div>
      </div>
      <div className="paper-accent" />
      <div className="paper-parties">
        <section>
          <label>QUOTE FOR</label>
          <strong>{quotation.client.name || "Client name"}</strong>
          {partyLines(quotation.client).map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </section>
        <section>
          <label>QUOTE DETAILS</label>
          <strong>{quotation.quoteNumber || "Quote number"}</strong>
          <span>Currency: {quotation.currency}</span>
          <span>Valid until: {date(quotation.validUntil)}</span>
        </section>
      </div>
      <table className="paper-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description || "—"}</td>
              <td>{item.quantity || "0"}</td>
              <td>{formatMoney(item.unitPrice, quotation.currency)}</td>
              <td>
                {formatMoney(
                  decimal(item.quantity).times(decimal(item.unitPrice)),
                  quotation.currency,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="paper-summary">
        <div className="summary-line">
          <span>Subtotal</span>
          <b>{formatMoney(totals.subtotal, quotation.currency)}</b>
        </div>
        {totals.discount.gt(0) ? (
          <div className="summary-line">
            <span>Discount</span>
            <b>-{formatMoney(totals.discount, quotation.currency)}</b>
          </div>
        ) : null}
        <div className="summary-line">
          <span>{quotation.taxLabel || "Tax"}</span>
          <b>{formatMoney(totals.tax, quotation.currency)}</b>
        </div>
        <div className="summary-total">
          <span>Estimated total</span>
          <strong>{formatMoney(totals.total, quotation.currency)}</strong>
        </div>
        <small className="estimate-note">This quotation is an estimate, not an invoice.</small>
      </div>
      <div className="paper-bottom">
        {quotation.scopeOfWork ? (
          <section>
            <label>SCOPE OF WORK</label>
            <p>{quotation.scopeOfWork}</p>
          </section>
        ) : null}
        {quotation.terms ? (
          <section>
            <label>TERMS & CONDITIONS</label>
            <p>{quotation.terms}</p>
          </section>
        ) : null}
        {quotation.notes ? (
          <section>
            <label>NOTES</label>
            <p>{quotation.notes}</p>
          </section>
        ) : null}
      </div>
      {quotation.showAcceptance ? (
        <div className="acceptance-block">
          <strong>ACCEPTANCE</strong>
          <p>By signing below, I accept this quotation and its terms.</p>
          <div className="acceptance-lines">
            <span>Name</span>
            <span>Signature</span>
            <span>Date</span>
          </div>
        </div>
      ) : null}
      {quotation.footer ? <div className="paper-footer">{quotation.footer}</div> : null}
    </article>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="https://codewithomesh.com">
        <span className="brand-mark">&lt;O/&gt;</span>
        <span className="brand-name">
          Code <b>with Omesh</b>
          <small>FREE ONLINE TOOLS</small>
        </span>
      </a>
      <div className="header-right">
        <span className="free-pill">
          <i />
          Free tool
        </span>
        <a href="https://codewithomesh.com" className="header-link">
          More tools <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}

export default function App() {
  const [quotation, setQuotation] = useState<Quotation>(() => createDefaultQuotation());
  const [hydrated, setHydrated] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [saved, setSaved] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const totals = useMemo(() => calculateQuotation(quotation), [quotation]);
  const patch = <K extends keyof Quotation>(key: K, value: Quotation[K]) =>
    setQuotation((current) => ({ ...current, [key]: value }));
  const patchItem = (id: string, key: keyof QuotationItem, value: string) =>
    patch(
      "items",
      quotation.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  const patchParty = (key: "business" | "client", value: PartyDetails) => patch(key, value);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Quotation>;
        setQuotation((current) => ({
          ...current,
          ...draft,
          business: { ...current.business, ...draft.business },
          client: { ...current.client, ...draft.client },
          items: Array.isArray(draft.items) ? draft.items : current.items,
        }));
      }
    } catch {
      // Browser storage is optional.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(quotation));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [quotation, hydrated]);

  const addItem = () =>
    patch("items", [
      ...quotation.items,
      { id: makeId(), description: "", quantity: "1", unitPrice: "0" },
    ]);
  const removeItem = (id: string) =>
    patch(
      "items",
      quotation.items.filter((item) => item.id !== id),
    );
  const moveItem = (id: string, direction: -1 | 1) => {
    const index = quotation.items.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= quotation.items.length) return;
    const items = [...quotation.items];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    patch("items", items);
  };
  const reset = () => {
    if (!window.confirm("Start a new quotation? Your current draft in this browser will be cleared."))
      return;
    localStorage.removeItem(DRAFT_KEY);
    setActionError("");
    setQuotation(createDefaultQuotation());
  };
  const checkQuotation = () => {
    const problem = validateQuotation(quotation);
    setActionError(problem ?? "");
    if (problem) setMobileTab("edit");
    return !problem;
  };
  const printQuotation = () => {
    if (checkQuotation()) window.print();
  };
  const downloadPdf = async () => {
    if (pdfBusy || !checkQuotation()) return;
    setPdfBusy(true);
    try {
      const { createQuotationPdf } = await import("./pdf");
      const blob = await createQuotationPdf(quotation);
      const name = quotation.quoteNumber.trim().replace(/[^a-z0-9-_]+/gi, "-") || "quotation";
      downloadBlob(blob, `${name}.pdf`);
    } catch {
      setActionError("The PDF could not be created. Please try again, or use Print instead.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="intro">
          <div className="intro-kicker">
            <Sparkles size={14} /> SIMPLE, PROFESSIONAL & FREE
          </div>
          <h1>
            Free online <span>quotation generator</span>
          </h1>
          <p>
            Create a clear, professional quote in minutes. Add your business and client details,
            estimate your costs, then download or print a PDF quotation.
          </p>
          <div className="trust-row">
            <span>
              <Check size={14} /> No sign-up
            </span>
            <span>
              <Check size={14} /> Multiple currencies
            </span>
            <span>
              <Check size={14} /> Your data stays local
            </span>
          </div>
        </section>

        <div className="mobile-switch" role="tablist" aria-label="Quotation editor view">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "edit"}
            className={mobileTab === "edit" ? "selected" : ""}
            onClick={() => setMobileTab("edit")}
          >
            Edit quote
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
                <h2>Quotation details</h2>
              </div>
              <span className="saved-indicator">
                {saved && hydrated ? (
                  <>
                    <b /> Saved locally
                  </>
                ) : (
                  "Saving draft…"
                )}
              </span>
            </div>

            <div className="editor-card">
              <section className="form-section">
                <div className="section-title">
                  <span>01</span>
                  <div>
                    <h3>Quote information</h3>
                    <p>Set your quote number, dates, currency and document style.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <TextInput
                    label="Quote number"
                    value={quotation.quoteNumber}
                    onChange={(v) => patch("quoteNumber", v)}
                    placeholder="QUO-1001"
                  />
                  <Field label="Currency">
                    <select value={quotation.currency} onChange={(e) => patch("currency", e.target.value)}>
                      {currencyCodes.map((code) => (
                        <option key={code} value={code}>
                          {code} —{" "}
                          {new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <TextInput
                    label="Issue date"
                    type="date"
                    value={quotation.issueDate}
                    onChange={(v) => patch("issueDate", v)}
                  />
                  <TextInput
                    label="Valid until"
                    type="date"
                    value={quotation.validUntil}
                    onChange={(v) => patch("validUntil", v)}
                  />
                </div>
                <div className="template-row">
                  <span>Quotation style</span>
                  <div className="template-options">
                    <button
                      type="button"
                      className={quotation.template === "simple" ? "active" : ""}
                      onClick={() => patch("template", "simple")}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      className={quotation.template === "professional" ? "active" : ""}
                      onClick={() => patch("template", "professional")}
                    >
                      Professional
                    </button>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="section-title">
                  <span>02</span>
                  <div>
                    <h3>Business & client</h3>
                    <p>Enter your business details and who the quote is for.</p>
                  </div>
                </div>
                <PartyFields
                  title="Your business"
                  value={quotation.business}
                  onChange={(v) => patchParty("business", v)}
                  onLogo={(v) => patchParty("business", { ...quotation.business, logoDataUrl: v })}
                />
                <div className="section-divider" />
                <PartyFields
                  title="Quote for"
                  value={quotation.client}
                  onChange={(v) => patchParty("client", v)}
                />
              </section>

              <section className="form-section">
                <div className="section-title">
                  <span>03</span>
                  <div>
                    <h3>Items & services</h3>
                    <p>Add the products or services included in this estimate.</p>
                  </div>
                </div>
                <div className="items-header">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit price</span>
                  <span>Total</span>
                  <span />
                  <span />
                </div>
                <div className="item-list">
                  {quotation.items.map((item, index) => (
                    <div className="item-row" key={item.id}>
                      <input
                        aria-label="Item description"
                        value={item.description}
                        onChange={(e) => patchItem(item.id, "description", e.target.value)}
                        placeholder="Product or service"
                      />
                      <input
                        aria-label="Quantity"
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => patchItem(item.id, "quantity", e.target.value)}
                      />
                      <input
                        aria-label="Unit price"
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => patchItem(item.id, "unitPrice", e.target.value)}
                      />
                      <span className="item-total">
                        {formatMoney(
                          decimal(item.quantity).times(decimal(item.unitPrice)),
                          quotation.currency,
                        )}
                      </span>
                      <div className="item-reorder">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Move item up"
                          title="Move item up"
                          onClick={() => moveItem(item.id, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Move item down"
                          title="Move item down"
                          onClick={() => moveItem(item.id, 1)}
                          disabled={index === quotation.items.length - 1}
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label="Remove item"
                        title="Remove item"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-item" onClick={addItem}>
                  <Plus size={15} /> Add item
                </button>
              </section>

              <section className="form-section">
                <div className="section-title">
                  <span>04</span>
                  <div>
                    <h3>Discount & tax</h3>
                    <p>Set an optional discount and tax rate for this quotation.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <Field label="Discount type">
                    <select
                      value={quotation.discountType}
                      onChange={(e) =>
                        patch("discountType", e.target.value as Quotation["discountType"])
                      }
                    >
                      <option value="fixed">Fixed amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </Field>
                  <TextInput
                    label={
                      quotation.discountType === "percentage"
                        ? "Discount (%)"
                        : `Discount (${quotation.currency})`
                    }
                    type="number"
                    value={quotation.discountValue}
                    onChange={(v) => patch("discountValue", v)}
                  />
                  <TextInput
                    label="Tax label"
                    value={quotation.taxLabel}
                    onChange={(v) => patch("taxLabel", v)}
                    placeholder="VAT / GST / Tax"
                  />
                  <TextInput
                    label="Tax rate (%)"
                    type="number"
                    value={quotation.taxRate}
                    onChange={(v) => patch("taxRate", v)}
                  />
                </div>
                <div className="totals-editor">
                  <div>
                    <span>Subtotal</span>
                    <b>{formatMoney(totals.subtotal, quotation.currency)}</b>
                  </div>
                  {totals.discount.gt(0) ? (
                    <div>
                      <span>Discount</span>
                      <b>-{formatMoney(totals.discount, quotation.currency)}</b>
                    </div>
                  ) : null}
                  <div>
                    <span>{quotation.taxLabel || "Tax"}</span>
                    <b>{formatMoney(totals.tax, quotation.currency)}</b>
                  </div>
                  <div className="grand-total">
                    <span>Estimated total</span>
                    <b>{formatMoney(totals.total, quotation.currency)}</b>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="section-title">
                  <span>05</span>
                  <div>
                    <h3>Scope, terms & notes</h3>
                    <p>These sections are optional and appear on the quotation when completed.</p>
                  </div>
                </div>
                <TextArea
                  label="Scope of work"
                  value={quotation.scopeOfWork}
                  onChange={(v) => patch("scopeOfWork", v)}
                  placeholder="Describe the work, deliverables or project scope"
                />
                <TextArea
                  label="Terms & conditions"
                  value={quotation.terms}
                  onChange={(v) => patch("terms", v)}
                  placeholder="Payment schedule, exclusions or other conditions"
                />
                <TextArea
                  label="Notes"
                  value={quotation.notes}
                  onChange={(v) => patch("notes", v)}
                  placeholder="Any additional information for your client"
                />
                <TextInput
                  label="Footer message"
                  value={quotation.footer}
                  onChange={(v) => patch("footer", v)}
                  placeholder="Thank you for considering our proposal"
                />
                <label className="acceptance-toggle">
                  <input
                    type="checkbox"
                    checked={quotation.showAcceptance}
                    onChange={(e) => patch("showAcceptance", e.target.checked)}
                  />
                  <span>
                    <b>Include an acceptance signature block</b>
                    <small>Add blank name, signature and date lines for printing.</small>
                  </span>
                </label>
              </section>

              <div className="editor-footer">
                <span>
                  <ShieldCheck size={15} /> Your quotation data stays in this browser.
                </span>
                <button type="button" className="text-button" onClick={reset}>
                  <RotateCcw size={14} /> New quote
                </button>
              </div>
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
              <QuotePaper quotation={quotation} />
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
              <button type="button" className="print-button" onClick={printQuotation}>
                <Printer size={16} /> Print quote
              </button>
            </div>
            <div className="preview-security">
              <ShieldCheck size={15} /> Private by design. Quote details are processed in your
              browser.
            </div>
            <div className="quick-totals">
              <span>Estimated total</span>
              <strong>{formatMoney(totals.total, quotation.currency)}</strong>
            </div>
          </aside>
        </div>

        <section className="below-content">
          <div className="below-intro">
            <span className="eyebrow">MADE FOR FREELANCERS & SMALL BUSINESS</span>
            <h2>Send clear estimates with confidence</h2>
            <p>
              Prepare a professional quotation for your next project without subscriptions,
              registration or complicated accounting software.
            </p>
          </div>
          <div className="benefits">
            <article>
              <i>
                <FileText size={19} />
              </i>
              <h3>Professional proposals</h3>
              <p>
                Choose a clean layout and include your logo, business details, client information
                and project scope.
              </p>
            </article>
            <article>
              <i>
                <Check size={19} />
              </i>
              <h3>Clear project estimates</h3>
              <p>
                Calculate line totals, discounts and tax automatically, with currency-aware
                rounding.
              </p>
            </article>
            <article>
              <i>
                <ShieldCheck size={19} />
              </i>
              <h3>Private by design</h3>
              <p>Quotation data is processed in your browser and drafts stay on this device.</p>
            </article>
          </div>
          <div className="faq">
            <h2>Frequently asked questions</h2>
            <details>
              <summary>Is this quotation generator free?</summary>
              <p>
                Yes. You can create, download and print quotations without registering or paying.
              </p>
            </details>
            <details>
              <summary>What is the difference between a quote and an invoice?</summary>
              <p>
                A quotation is an estimate of proposed work and pricing shared before an agreement.
                An invoice requests payment for goods or services that have been supplied.
              </p>
            </details>
            <details>
              <summary>Is my data uploaded?</summary>
              <p>
                No. Your quotation is created in your browser. A local draft is stored in this
                browser so you can continue after refreshing.
              </p>
            </details>
            <details>
              <summary>How long is a quotation valid?</summary>
              <p>
                You choose the validity period. New quotations default to 30 days from the issue
                date, and you can change the valid-until date before exporting.
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
