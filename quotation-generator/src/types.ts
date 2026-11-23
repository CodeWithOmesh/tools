export type QuotationTemplate = "simple" | "professional";
export type DiscountType = "fixed" | "percentage";

export interface PartyDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  logoDataUrl: string;
}

export interface QuotationItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface Quotation {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  currency: string;
  template: QuotationTemplate;
  business: PartyDetails;
  client: PartyDetails;
  items: QuotationItem[];
  discountType: DiscountType;
  discountValue: string;
  taxLabel: string;
  taxRate: string;
  scopeOfWork: string;
  terms: string;
  notes: string;
  footer: string;
  showAcceptance: boolean;
}

export const DRAFT_KEY = "cwo-quotation-draft-v1";

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDefaultQuotation(): Quotation {
  const today = new Date();
  const valid = new Date(today);
  valid.setDate(valid.getDate() + 30);

  return {
    quoteNumber: "QUO-1001",
    issueDate: localDate(today),
    validUntil: localDate(valid),
    currency: "USD",
    template: "professional",
    business: { name: "", email: "", phone: "", address: "", taxId: "", logoDataUrl: "" },
    client: { name: "", email: "", phone: "", address: "", taxId: "", logoDataUrl: "" },
    items: [{ id: "item-1", description: "", quantity: "1", unitPrice: "0" }],
    discountType: "fixed",
    discountValue: "0",
    taxLabel: "Tax",
    taxRate: "0",
    scopeOfWork: "",
    terms: "",
    notes: "",
    footer: "",
    showAcceptance: false,
  };
}

function isNonNegativeNumber(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
}

/** Returns the first problem that should stop the quotation being exported, or null. */
export function validateQuotation(quotation: Quotation): string | null {
  if (!quotation.quoteNumber.trim()) return "Enter a quotation number.";
  if (!quotation.issueDate) return "Choose an issue date.";
  if (!quotation.validUntil) return "Choose a valid-until date.";
  if (quotation.validUntil < quotation.issueDate)
    return "The valid-until date cannot be before the issue date.";
  if (!quotation.business.name.trim()) return "Enter your business name.";
  if (!quotation.client.name.trim()) return "Enter the name of the client you are quoting.";
  if (!quotation.items.length) return "Add at least one item.";
  for (const item of quotation.items) {
    if (!item.description.trim()) return "Enter a description for every item.";
    if (!isNonNegativeNumber(item.quantity) || Number(item.quantity) === 0)
      return "Each item quantity must be greater than zero.";
    if (!isNonNegativeNumber(item.unitPrice))
      return "Enter a valid non-negative unit price for every item.";
  }
  if (quotation.discountValue.trim() !== "" && !isNonNegativeNumber(quotation.discountValue))
    return "Discount must be zero or a positive number.";
  if (quotation.taxRate.trim() !== "" && !isNonNegativeNumber(quotation.taxRate))
    return "Tax rate must be zero or a positive number.";
  if (quotation.discountType === "percentage" && Number(quotation.discountValue) > 100)
    return "A percentage discount cannot be more than 100%.";
  return null;
}
