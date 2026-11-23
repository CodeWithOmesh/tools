import { useState } from "react";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { useReceipt } from "./store";
import { validateReceipt } from "./receipt";
import { calculate } from "./money";
export default function ReceiptActions() {
  const r = useReceipt((s) => s.receipt);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const validate = () => {
    const issue = validateReceipt(r);
    if (issue) {
      setError(issue);
      return false;
    }
    const t = calculate(r);
    if (t.discount.gt(t.subtotal)) {
      setError("Discount cannot be greater than the subtotal.");
      return false;
    }
    if (r.discount.type === "percentage" && Number(r.discount.value) > 100) {
      setError("Discount percentage cannot exceed 100%.");
      return false;
    }
    return true;
  };
  const download = async () => {
    if (!validate()) return;
    setError("");
    setBusy(true);
    try {
      const { createReceiptPdf } = await import("./pdf");
      const blob = await createReceiptPdf(r),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "receipt-" + (r.receiptNumber.replace(/[^a-zA-Z0-9-_]/g, "-") || "new") + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("PDF generation failed. Please try again or use Print.");
    } finally {
      setBusy(false);
    }
  };
  const print = () => {
    if (!validate()) return;
    setError("");
    window.print();
  };
  return (
    <div className="actions">
      {error && (
        <p role="alert" className="action-error">
          {error}
        </p>
      )}
      <div>
        <button type="button" className="secondary-button" onClick={print}>
          <Printer size={16} /> Print
        </button>
        <button type="button" className="primary-button" onClick={download} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}{" "}
          {busy ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
