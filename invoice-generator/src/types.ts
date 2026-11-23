export type InvoiceTemplate = "simple" | "professional";
export type DiscountType = "fixed" | "percentage";

export interface PartyDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  logoDataUrl: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface Invoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  template: InvoiceTemplate;
  seller: PartyDetails;
  client: PartyDetails;
  items: InvoiceItem[];
  discountType: DiscountType;
  discountValue: string;
  taxLabel: string;
  taxRate: string;
  amountPaid: string;
  paymentDetails: string;
  notes: string;
  terms: string;
  footer: string;
}

export const DRAFT_KEY = "cwo-invoice-draft-v1";

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDefaultInvoice(): Invoice {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);

  return {
    invoiceNumber: "INV-1001",
    issueDate: localDate(today),
    dueDate: localDate(due),
    currency: "USD",
    template: "professional",
    // Party details start empty so placeholder text can never leak into a real invoice.
    seller: { name: "", email: "", phone: "", address: "", taxId: "", logoDataUrl: "" },
    client: { name: "", email: "", phone: "", address: "", taxId: "", logoDataUrl: "" },
    items: [{ id: "item-1", description: "", quantity: "1", unitPrice: "0" }],
    discountType: "fixed",
    discountValue: "0",
    taxLabel: "Tax",
    taxRate: "0",
    amountPaid: "0",
    paymentDetails: "Please include the invoice number with your payment.",
    notes: "Thank you for your business.",
    terms: "Payment is due by the date shown above.",
    footer: "",
  };
}

function isNonNegativeNumber(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
}

/** Returns the first problem that should stop the invoice being exported, or null. */
export function validateInvoice(invoice: Invoice): string | null {
  if (!invoice.invoiceNumber.trim()) return "Enter an invoice number.";
  if (!invoice.issueDate) return "Choose an issue date.";
  if (invoice.dueDate && invoice.dueDate < invoice.issueDate)
    return "The due date cannot be before the issue date.";
  if (!invoice.seller.name.trim()) return "Enter your business name.";
  if (!invoice.client.name.trim()) return "Enter the name of the client you are billing.";
  if (!invoice.items.length) return "Add at least one item.";
  for (const item of invoice.items) {
    if (!item.description.trim()) return "Enter a description for every item.";
    if (!isNonNegativeNumber(item.quantity) || Number(item.quantity) === 0)
      return "Each item quantity must be greater than zero.";
    if (!isNonNegativeNumber(item.unitPrice)) return "Enter a valid unit price for every item.";
  }
  for (const [label, value] of [
    ["Discount", invoice.discountValue],
    ["Tax rate", invoice.taxRate],
    ["Amount paid", invoice.amountPaid],
  ] as const) {
    if (value.trim() !== "" && !isNonNegativeNumber(value))
      return `${label} must be zero or a positive number.`;
  }
  if (invoice.discountType === "percentage" && Number(invoice.discountValue) > 100)
    return "A percentage discount cannot be more than 100%.";
  return null;
}
