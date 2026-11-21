import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ArrowDownToLine, ArrowUpRight, CalendarDays, Check, FileText, ImagePlus, Plus, Printer, RotateCcw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { calculateInvoice, formatMoney } from "./money";
import InvoicePdf from "./InvoicePdf";
import { createDefaultInvoice, DRAFT_KEY, type Invoice, type InvoiceItem, type PartyDetails } from "./types";

const currencyCodes = ["AED","AUD","BDT","BHD","BRL","CAD","CHF","CNY","DKK","EGP","EUR","GBP","HKD","IDR","ILS","INR","IQD","JPY","KES","KRW","KWD","LKR","MAD","MUR","MXN","MYR","NGN","NOK","NPR","NZD","OMR","PHP","PKR","PLN","QAR","RON","SAR","SEK","SGD","THB","TRY","TWD","TZS","UAH","USD","VND","ZAR"];
const makeId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}
function TextInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <Field label={label}><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Field>;
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <Field label={label}><textarea value={value} placeholder={placeholder} rows={3} onChange={(event) => onChange(event.target.value)} /></Field>;
}
function PartyFields({ title, value, onChange, onLogo }: { title: string; value: PartyDetails; onChange: (next: PartyDetails) => void; onLogo: (data: string) => void }) {
  const patch = (key: keyof PartyDetails, next: string) => onChange({ ...value, [key]: next });
  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { window.alert("Please choose an image file."); return; }
    if (file.size > 1_500_000) { window.alert("Please choose an image smaller than 1.5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => onLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  return <div className="party-form">
    <div className="subhead"><h3>{title}</h3>{title === "Your business" ? <label className="logo-upload"><ImagePlus size={14}/>{value.logoDataUrl ? "Change logo" : "Add logo"}<input type="file" accept="image/*" onChange={uploadLogo} hidden /></label> : null}</div>
    {value.logoDataUrl && title === "Your business" ? <div className="logo-row"><img src={value.logoDataUrl} alt="Business logo"/><button type="button" className="text-button" onClick={() => onLogo("")}>Remove logo</button></div> : null}
    <TextInput label="Name / company" value={value.name} onChange={(v) => patch("name", v)} placeholder="Company or individual name"/>
    <div className="form-grid"><TextInput label="Email" type="email" value={value.email} onChange={(v) => patch("email", v)} placeholder="name@example.com"/><TextInput label="Phone" value={value.phone} onChange={(v) => patch("phone", v)} placeholder="+1 555 0100"/></div>
    <TextInput label="Address" value={value.address} onChange={(v) => patch("address", v)} placeholder="Street, city, country"/>
    <TextInput label="Tax ID (optional)" value={value.taxId} onChange={(v) => patch("taxId", v)} placeholder="VAT / tax registration number"/>
  </div>;
}

function InvoicePaper({ invoice }: { invoice: Invoice }) {
  const totals = calculateInvoice(invoice);
  const date = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const partyDetails = (p: PartyDetails) => [p.address, p.email, p.phone, p.taxId ? `Tax ID: ${p.taxId}` : ""].filter(Boolean);
  return <article className={`invoice-paper ${invoice.template}`}>
    <div className="paper-top">
      <div className="paper-seller">{invoice.seller.logoDataUrl ? <img src={invoice.seller.logoDataUrl} alt="Business logo" className="paper-logo"/> : null}<div><strong>{invoice.seller.name || "Your business"}</strong>{partyDetails(invoice.seller).map((line, i) => <span key={i}>{line}</span>)}</div></div>
      <div className="paper-heading"><h2>INVOICE</h2><span>#{invoice.invoiceNumber || "—"}</span><small>Issued {date(invoice.issueDate)}</small><small>Due {date(invoice.dueDate)}</small></div>
    </div>
    <div className="paper-accent"/>
    <div className="paper-parties"><section><label>BILL TO</label><strong>{invoice.client.name || "Client name"}</strong>{partyDetails(invoice.client).map((line, i) => <span key={i}>{line}</span>)}</section><section><label>STATUS</label><strong className={`status ${totals.status.toLowerCase().replace(" ", "-")}`}>{totals.status}</strong><span>{invoice.currency}</span></section></div>
    <table className="paper-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{invoice.items.map(item => <tr key={item.id}><td>{item.description || "—"}</td><td>{item.quantity || "0"}</td><td>{formatMoney(item.unitPrice, invoice.currency)}</td><td>{formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0), invoice.currency)}</td></tr>)}</tbody></table>
    <div className="paper-summary"><div className="summary-line"><span>Subtotal</span><b>{formatMoney(totals.subtotal, invoice.currency)}</b></div><div className="summary-line"><span>Discount</span><b>−{formatMoney(totals.discount, invoice.currency)}</b></div><div className="summary-line"><span>{invoice.taxLabel || "Tax"}</span><b>{formatMoney(totals.tax, invoice.currency)}</b></div><div className="summary-total"><span>Total</span><strong>{formatMoney(totals.total, invoice.currency)}</strong></div><div className="summary-line"><span>Amount paid</span><b>{formatMoney(totals.amountPaid, invoice.currency)}</b></div><div className="summary-due"><span>Amount due</span><strong>{formatMoney(totals.amountDue, invoice.currency)}</strong></div></div>
    <div className="paper-bottom">{invoice.paymentDetails ? <section><label>PAYMENT DETAILS</label><p>{invoice.paymentDetails}</p></section> : null}{invoice.notes ? <section><label>NOTES</label><p>{invoice.notes}</p></section> : null}{invoice.terms ? <section><label>TERMS & CONDITIONS</label><p>{invoice.terms}</p></section> : null}</div>
    {invoice.footer ? <div className="paper-footer">{invoice.footer}</div> : null}
  </article>;
}

function Header() {
  return <header className="site-header"><a className="brand" href="https://codewithomesh.com"><span className="brand-mark">&lt;O/&gt;</span><span className="brand-name">Code <b>with Omesh</b><small>FREE ONLINE TOOLS</small></span></a><div className="header-right"><span className="free-pill"><i/>Free tool</span><a href="https://codewithomesh.com" className="header-link">More tools <ArrowUpRight size={15}/></a></div></header>;
}

export default function App() {
  const [invoice, setInvoice] = useState<Invoice>(() => createDefaultInvoice());
  const [hydrated, setHydrated] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [saved, setSaved] = useState(true);
  const totals = useMemo(() => calculateInvoice(invoice), [invoice]);
  const patch = <K extends keyof Invoice>(key: K, value: Invoice[K]) => setInvoice(current => ({ ...current, [key]: value }));
  const patchItem = (id: string, key: keyof InvoiceItem, value: string) => patch("items", invoice.items.map(item => item.id === id ? { ...item, [key]: value } : item));
  const patchParty = (key: "seller" | "client", value: PartyDetails) => patch(key, value);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Invoice>;
        setInvoice(current => ({ ...current, ...draft, seller: { ...current.seller, ...draft.seller }, client: { ...current.client, ...draft.client }, items: Array.isArray(draft.items) ? draft.items : current.items }));
      }
    } catch { /* Browser storage is optional. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [invoice, hydrated]);

  const addItem = () => patch("items", [...invoice.items, { id: makeId(), description: "", quantity: "1", unitPrice: "0" }]);
  const removeItem = (id: string) => patch("items", invoice.items.filter(item => item.id !== id));
  const reset = () => {
    if (!window.confirm("Replace this invoice with a fresh example? Your current browser draft will be overwritten.")) return;
    setInvoice(createDefaultInvoice());
  };
  const printInvoice = () => window.print();

  return <div className="app-shell">
    <Header/>
    <main>
      <section className="intro"><div className="intro-kicker"><Sparkles size={14}/> SIMPLE, PROFESSIONAL & FREE</div><h1>Free online <span>invoice generator</span></h1><p>Create a polished invoice in minutes. Add your business and client details, calculate tax and discounts automatically, then download or print.</p><div className="trust-row"><span><Check size={14}/> No sign-up</span><span><Check size={14}/> Multiple currencies</span><span><Check size={14}/> Your data stays local</span></div></section>
      <div className="mobile-switch" role="tablist" aria-label="Invoice editor view"><button type="button" role="tab" aria-selected={mobileTab === "edit"} className={mobileTab === "edit" ? "selected" : ""} onClick={() => setMobileTab("edit")}>Edit invoice</button><button type="button" role="tab" aria-selected={mobileTab === "preview"} className={mobileTab === "preview" ? "selected" : ""} onClick={() => setMobileTab("preview")}>Live preview</button></div>
      <div className="workspace">
        <section className={`editor-column ${mobileTab === "edit" ? "mobile-active" : ""}`}>
          <div className="column-heading"><div><i>01</i><h2>Invoice details</h2></div><span className="saved-indicator">{saved && hydrated ? <><b/> Saved locally</> : "Saving draft…"}</span></div>
          <div className="editor-card">
            <section className="form-section"><div className="section-title"><span>01</span><div><h3>Invoice information</h3><p>Set your invoice number, dates and currency.</p></div></div>
              <div className="form-grid"><TextInput label="Invoice number" value={invoice.invoiceNumber} onChange={v => patch("invoiceNumber", v)} placeholder="INV-1001"/><Field label="Currency"><select value={invoice.currency} onChange={e => patch("currency", e.target.value)}>{currencyCodes.map(code => <option key={code} value={code}>{code} — {new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code}</option>)}</select></Field>
                <TextInput label="Issue date" type="date" value={invoice.issueDate} onChange={v => patch("issueDate", v)}/><TextInput label="Due date" type="date" value={invoice.dueDate} onChange={v => patch("dueDate", v)}/></div>
              <div className="template-row"><span>Invoice style</span><div className="template-options"><button type="button" className={invoice.template === "simple" ? "active" : ""} onClick={() => patch("template", "simple")}>Simple</button><button type="button" className={invoice.template === "professional" ? "active" : ""} onClick={() => patch("template", "professional")}>Professional</button></div></div>
            </section>
            <section className="form-section"><div className="section-title"><span>02</span><div><h3>From & bill to</h3><p>Enter the business and customer details.</p></div></div><PartyFields title="Your business" value={invoice.seller} onChange={v => patchParty("seller", v)} onLogo={v => patchParty("seller", { ...invoice.seller, logoDataUrl: v })}/><div className="section-divider"/><PartyFields title="Bill to" value={invoice.client} onChange={v => patchParty("client", v)} onLogo={() => undefined}/></section>
            <section className="form-section"><div className="section-title"><span>03</span><div><h3>Items & services</h3><p>Add the products or services on this invoice.</p></div></div>
              <div className="items-header"><span>Description</span><span>Qty</span><span>Unit price</span><span>Total</span><span/></div>
              <div className="item-list">{invoice.items.map(item => <div className="item-row" key={item.id}><input aria-label="Item description" value={item.description} onChange={e => patchItem(item.id, "description", e.target.value)} placeholder="Service or product"/><input aria-label="Quantity" type="number" min="0" step="any" value={item.quantity} onChange={e => patchItem(item.id, "quantity", e.target.value)}/><input aria-label="Unit price" type="number" min="0" step="any" value={item.unitPrice} onChange={e => patchItem(item.id, "unitPrice", e.target.value)}/><span className="item-total">{formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0), invoice.currency)}</span><button type="button" className="icon-button danger" aria-label="Remove item" onClick={() => removeItem(item.id)} disabled={invoice.items.length === 1}><Trash2 size={15}/></button></div>)}</div>
              <button type="button" className="add-item" onClick={addItem}><Plus size={15}/> Add item</button>
            </section>
            <section className="form-section"><div className="section-title"><span>04</span><div><h3>Discount, tax & payment</h3><p>Adjust the invoice totals and record payments received.</p></div></div>
              <div className="form-grid"><Field label="Discount type"><select value={invoice.discountType} onChange={e => patch("discountType", e.target.value as Invoice["discountType"])}><option value="fixed">Fixed amount</option><option value="percentage">Percentage</option></select></Field><TextInput label={invoice.discountType === "percentage" ? "Discount (%)" : `Discount (${invoice.currency})`} type="number" value={invoice.discountValue} onChange={v => patch("discountValue", v)}/><TextInput label="Tax label" value={invoice.taxLabel} onChange={v => patch("taxLabel", v)} placeholder="VAT / GST / Tax"/><TextInput label="Tax rate (%)" type="number" value={invoice.taxRate} onChange={v => patch("taxRate", v)}/><TextInput label={`Amount paid (${invoice.currency})`} type="number" value={invoice.amountPaid} onChange={v => patch("amountPaid", v)}/></div>
              <div className="payment-status"><span>Payment status</span><strong className={totals.status.toLowerCase().replace(" ", "-")}>{totals.status}</strong></div>
              <div className="totals-editor"><div><span>Subtotal</span><b>{formatMoney(totals.subtotal, invoice.currency)}</b></div><div><span>Discount</span><b>−{formatMoney(totals.discount, invoice.currency)}</b></div><div><span>{invoice.taxLabel || "Tax"}</span><b>{formatMoney(totals.tax, invoice.currency)}</b></div><div className="grand-total"><span>Total</span><b>{formatMoney(totals.total, invoice.currency)}</b></div><div><span>Amount due</span><b>{formatMoney(totals.amountDue, invoice.currency)}</b></div></div>
            </section>
            <section className="form-section"><div className="section-title"><span>05</span><div><h3>Notes & terms</h3><p>Add payment instructions, notes or conditions.</p></div></div>
              <TextArea label="Payment details" value={invoice.paymentDetails} onChange={v => patch("paymentDetails", v)} placeholder="Bank name, account number or payment instructions"/>
              <TextArea label="Notes" value={invoice.notes} onChange={v => patch("notes", v)} placeholder="A message for your customer"/>
              <TextArea label="Terms & conditions" value={invoice.terms} onChange={v => patch("terms", v)} placeholder="Payment terms, late fees or other conditions"/>
              <TextInput label="Footer message" value={invoice.footer} onChange={v => patch("footer", v)} placeholder="Thank you for your business"/>
            </section>
            <div className="editor-footer"><span><ShieldCheck size={15}/> Your invoice data stays in this browser.</span><button type="button" className="text-button" onClick={reset}><RotateCcw size={14}/> Reset example</button></div>
          </div>
        </section>
        <aside className={`preview-column ${mobileTab === "preview" ? "mobile-active" : ""}`}>
          <div className="column-heading"><div><i>02</i><h2>Live preview</h2></div><span className="live-pill"><b/> LIVE</span></div>
          <div className="preview-stage"><InvoicePaper invoice={invoice}/></div>
          <div className="action-bar"><PDFDownloadLink document={<InvoicePdf invoice={invoice}/>} fileName={`${(invoice.invoiceNumber || "invoice").replace(/[^a-z0-9-_]/gi, "-")}.pdf`} className="download-button">{({ loading, error }) => <><ArrowDownToLine size={16}/>{loading ? "Preparing PDF…" : error ? "PDF unavailable" : "Download PDF"}</>}</PDFDownloadLink><button type="button" className="print-button" onClick={printInvoice}><Printer size={16}/> Print invoice</button></div>
          <div className="preview-security"><ShieldCheck size={15}/> Private by design. Invoice details are processed in your browser.</div>
          <div className="quick-totals"><span>Amount due</span><strong>{formatMoney(totals.amountDue, invoice.currency)}</strong></div>
        </aside>
      </div>
      <section className="below-content"><div className="below-intro"><span className="eyebrow">MADE FOR FREELANCERS & SMALL BUSINESS</span><h2>Everything you need to invoice with confidence</h2><p>Create clear invoices for your work without subscriptions, registration or complicated accounting software.</p></div><div className="benefits"><article><i><FileText size={19}/></i><h3>Professional invoices</h3><p>Choose a clean layout and add your logo, business details and client information.</p></article><article><i><CalendarDays size={19}/></i><h3>Automatic calculations</h3><p>Calculate line totals, discounts, tax, payments received and the remaining balance.</p></article><article><i><ShieldCheck size={19}/></i><h3>Privacy-first</h3><p>Invoice data is processed in your browser and drafts stay on this device.</p></article></div><div className="faq"><h2>Frequently asked questions</h2><details><summary>Is this invoice generator free?</summary><p>Yes. You can create, download and print invoices without registering or paying.</p></details><details><summary>Can I use different currencies?</summary><p>Yes. Select a supported currency. Amounts follow its standard decimal precision.</p></details><details><summary>Are my invoice details uploaded?</summary><p>No. Your invoice is created in your browser. A local draft is stored in this browser so you can continue after refreshing.</p></details><details><summary>Can I record a partial payment?</summary><p>Yes. Enter the amount received. The payment status and remaining amount due are calculated automatically.</p></details></div></section>
    </main>
    <footer className="site-footer"><span>© {new Date().getFullYear()} Code with Omesh</span><span>Useful tools. Simple solutions.</span><a href="https://codewithomesh.com">codewithomesh.com <ArrowUpRight size={13}/></a></footer>
  </div>;
}
