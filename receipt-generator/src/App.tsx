import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ArrowUpRight, Check, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { get, set, del } from "idb-keyval";
import ReceiptEditor from "./ReceiptEditor";
import ReceiptPreview from "./ReceiptPreview";
import ReceiptActions from "./ReceiptActions";
import { useReceipt } from "./store";
import type { Receipt } from "./types";
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
function Page() {
  const r = useReceipt((s) => s.receipt),
    setReceipt = useReceipt((s) => s.setReceipt);
  const [hydrated, setHydrated] = useState(false),
    [mobile, setMobile] = useState<"edit" | "preview">("edit");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = localStorage.getItem("cwo-receipt-draft-v1");
        if (raw) {
          const draft = JSON.parse(raw) as Partial<Receipt>,
            logo = (await get<string>("cwo-receipt-logo-v1")) ?? "";
          if (alive) {
            const current = useReceipt.getState().receipt;
            setReceipt({
              ...current,
              ...draft,
              business: { ...current.business, ...draft.business, logoDataUrl: logo },
              customer: { ...current.customer, ...draft.customer },
              discount: { ...current.discount, ...draft.discount },
              tax: { ...current.tax, ...draft.tax },
              items: draft.items?.length ? draft.items : current.items,
            });
          }
        }
      } catch {
        /* local storage is optional */
      }
      if (alive) setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, [setReceipt]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      const draft = { ...r, business: { ...r.business, logoDataUrl: "" } };
      localStorage.setItem("cwo-receipt-draft-v1", JSON.stringify(draft));
      if (r.business.logoDataUrl) void set("cwo-receipt-logo-v1", r.business.logoDataUrl);
      else void del("cwo-receipt-logo-v1");
    } catch {
      /* storage is optional */
    }
  }, [r, hydrated]);
  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="intro">
          <div className="intro-kicker">
            <Sparkles size={14} /> SIMPLE, PROFESSIONAL & FREE
          </div>
          <h1>
            Free online <span>receipt generator</span>
          </h1>
          <p>
            Create a professional receipt in seconds. Customize your details, preview it live, then
            download or print — no account needed.
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
        <div className="mobile-switch" role="tablist" aria-label="Editor view">
          <button
            type="button"
            role="tab"
            aria-selected={mobile === "edit"}
            className={mobile === "edit" ? "selected" : ""}
            onClick={() => setMobile("edit")}
          >
            Edit receipt
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobile === "preview"}
            className={mobile === "preview" ? "selected" : ""}
            onClick={() => setMobile("preview")}
          >
            Live preview
          </button>
        </div>
        <div className="workspace">
          <section className={"editor-column " + (mobile === "edit" ? "mobile-active" : "")}>
            <div className="column-heading">
              <div>
                <i>01</i>
                <h2>Receipt details</h2>
              </div>
              <span className="saved-indicator">
                {hydrated ? (
                  <>
                    <b /> Saved locally
                  </>
                ) : (
                  "Loading draft…"
                )}
              </span>
            </div>
            <ReceiptEditor />
          </section>
          <aside className={"preview-column " + (mobile === "preview" ? "mobile-active" : "")}>
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
              <ReceiptPreview />
            </div>
            <ReceiptActions />
            <div className="preview-security">
              <ShieldCheck size={15} /> Private by design. Receipt details are processed in your
              browser.
            </div>
          </aside>
        </div>
        <section className="below-content">
          <div className="below-intro">
            <span className="eyebrow">MADE FOR EVERYDAY BUSINESS</span>
            <h2>Everything you need to create a receipt</h2>
            <p>
              Whether you run a small shop, work as a freelancer or need a simple payment record,
              create a clean receipt without installing software.
            </p>
          </div>
          <div className="benefits">
            <article>
              <i>
                <FileCheck2 size={19} />
              </i>
              <h3>Two professional layouts</h3>
              <p>Choose a minimal Simple receipt or a polished Professional design.</p>
            </article>
            <article>
              <i>
                <Sparkles size={19} />
              </i>
              <h3>Flexible currencies</h3>
              <p>Choose from supported ISO currencies with currency-aware decimal formatting.</p>
            </article>
            <article>
              <i>
                <ShieldCheck size={19} />
              </i>
              <h3>Privacy-first</h3>
              <p>
                Your receipt is generated in your browser. We do not receive your customer or
                payment details.
              </p>
            </article>
          </div>
          <div className="faq">
            <h2>Frequently asked questions</h2>
            <details>
              <summary>Is this receipt generator free?</summary>
              <p>
                Yes. Create, preview, download and print receipts without registering or paying.
              </p>
            </details>
            <details>
              <summary>Can I create receipts in different currencies?</summary>
              <p>
                Yes. Select a supported ISO currency code. Amounts use that currency standard
                decimal precision.
              </p>
            </details>
            <details>
              <summary>Are my receipt details uploaded?</summary>
              <p>
                No. Receipt details are processed in your browser. A local draft is saved in this
                browser so you can continue after refreshing.
              </p>
            </details>
            <details>
              <summary>Can I print a thermal receipt?</summary>
              <p>
                Yes. Select 58 mm or 80 mm thermal paper before printing or downloading the PDF.
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
export default function App() {
  return (
    <Routes>
      <Route path="/tools/receipt-generator" element={<Page />} />
      <Route path="*" element={<Navigate to="/tools/receipt-generator" replace />} />
    </Routes>
  );
}
