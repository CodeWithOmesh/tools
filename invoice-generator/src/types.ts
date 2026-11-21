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
    seller: {
      name: "Your Business Name",
      email: "hello@example.com",
      phone: "",
      address: "Business address",
      taxId: "",
      logoDataUrl: "",
    },
    client: {
      name: "Client or Company Name",
      email: "",
      phone: "",
      address: "",
      taxId: "",
      logoDataUrl: "",
    },
    items: [
      { id: "item-1", description: "Professional services", quantity: "1", unitPrice: "500" },
      { id: "item-2", description: "Additional work", quantity: "2", unitPrice: "75" },
    ],
    discountType: "fixed",
    discountValue: "0",
    taxLabel: "Tax",
    taxRate: "0",
    amountPaid: "0",
    paymentDetails: "Please include the invoice number with your payment.",
    notes: "Thank you for your business.",
    terms: "Payment is due by the date shown above.",
    footer: "We appreciate your business.",
  };
}
