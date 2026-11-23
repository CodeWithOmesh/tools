import { CheckCircle2, CircleDollarSign } from "lucide-react";
import { useReceipt } from "./store";
import { calculate, dec, money } from "./money";
export default function ReceiptPreview() {
  const r = useReceipt((s) => s.receipt),
    t = calculate(r),
    status =
      t.status === "paid" ? "PAID IN FULL" : t.status === "partial" ? "PARTIALLY PAID" : "UNPAID",
    method = r.paymentMethod.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    contact = [
      r.business.phone,
      r.business.email,
      r.business.website,
      r.business.taxNumber ? "Tax ID: " + r.business.taxNumber : "",
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    <div
      id="receipt-print-area"
      className={
        "receipt-paper " +
        r.template +
        " " +
        (r.paperSize === "a4" ? "a4-paper" : "thermal-paper " + r.paperSize)
      }
    >
      {r.template === "professional" ? (
        <>
          <div className="pro-head">
            <div className="pro-business">
              {r.business.logoDataUrl && (
                <img className="receipt-logo" src={r.business.logoDataUrl} alt="" />
              )}
              <div>
                <h2>{r.business.name || "Your Business Name"}</h2>
                {r.business.address && <p>{r.business.address}</p>}
              </div>
            </div>
            <div className="pro-title">
              <span>PAYMENT RECEIPT</span>
              <b>{r.receiptNumber || "REC-000001"}</b>
            </div>
          </div>
          <div className="pro-accent" />
        </>
      ) : (
        <div className="simple-head">
          {r.business.logoDataUrl && (
            <img className="receipt-logo centered" src={r.business.logoDataUrl} alt="" />
          )}
          <h2>{r.business.name || "Your Business Name"}</h2>
          {r.business.address && <p>{r.business.address}</p>}
          <span>PAYMENT RECEIPT</span>
          <b>{r.receiptNumber || "REC-000001"}</b>
        </div>
      )}
      {contact && <div className="receipt-contact">{contact}</div>}
      <div className="receipt-info">
        <div>
          <small>RECEIPT DATE</small>
          <b>{r.date || "—"}</b>
          {r.time && <span>{r.time}</span>}
        </div>
        <div>
          <small>PAYMENT STATUS</small>
          <b className={"status " + t.status}>{status}</b>
        </div>
        {r.customer.name && (
          <div>
            <small>RECEIVED FROM</small>
            <b>{r.customer.name}</b>
            {r.customer.address && <span>{r.customer.address}</span>}
          </div>
        )}
        {(r.customer.phone || r.customer.email) && (
          <div>
            <small>CUSTOMER CONTACT</small>
            <b>{r.customer.phone || r.customer.email}</b>
            {r.customer.phone && r.customer.email && <span>{r.customer.email}</span>}
          </div>
        )}
      </div>
      <table className="receipt-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="right">Qty</th>
            <th className="right">Unit price</th>
            <th className="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((i) => (
            <tr key={i.id}>
              <td>{i.description || "Item description"}</td>
              <td className="right">{i.quantity || "0"}</td>
              <td className="right">{money(i.unitPrice || 0, r.currency)}</td>
              <td className="right">
                {money(dec(i.quantity || 0).times(dec(i.unitPrice || 0)), r.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-bottom">
        <div className="payment-info">
          <small>PAYMENT METHOD</small>
          <b>{method}</b>
          {r.transactionReference && <span>Reference: {r.transactionReference}</span>}
        </div>
        <div className="receipt-totals">
          <div>
            <span>Subtotal</span>
            <b>{money(t.subtotal, r.currency)}</b>
          </div>
          {t.discount.gt(0) && (
            <div>
              <span>Discount</span>
              <b>−{money(t.discount, r.currency)}</b>
            </div>
          )}
          {t.tax.gt(0) && (
            <div>
              <span>{r.tax.label || "Tax"}</span>
              <b>{money(t.tax, r.currency)}</b>
            </div>
          )}
          <div className="grand">
            <span>Total</span>
            <b>{money(t.total, r.currency)}</b>
          </div>
          <div>
            <span>Amount paid</span>
            <b>{money(t.amountPaid, r.currency)}</b>
          </div>
          <div className="balance">
            <span>Balance due</span>
            <b>{money(t.balanceDue, r.currency)}</b>
          </div>
        </div>
      </div>
      {r.notes && (
        <div className="extra">
          <b>Notes:</b> {r.notes}
        </div>
      )}
      {r.terms && (
        <div className="extra">
          <b>Terms:</b> {r.terms}
        </div>
      )}
      <div className="thank">{r.footer || "Thank you for your business!"}</div>
      <div className="paper-brand">
        {r.template === "professional" ? (
          <>
            <CheckCircle2 size={12} /> PAYMENT RECEIPT
          </>
        ) : (
          <>
            <CircleDollarSign size={12} /> RECEIPT
          </>
        )}
      </div>
    </div>
  );
}
