// Loaded on demand so the PDF renderer is not part of the initial page download.
import { pdf } from "@react-pdf/renderer";
import QuotationPdf from "./QuotationPdf";
import type { Quotation } from "./types";

export function createQuotationPdf(quotation: Quotation): Promise<Blob> {
  return pdf(<QuotationPdf quotation={quotation} />).toBlob();
}
