// Loaded on demand so the large PDF renderer is not part of the initial page download.
import { pdf } from "@react-pdf/renderer";
import InvoicePdf from "./InvoicePdf";
import type { Invoice } from "./types";

export function createInvoicePdf(invoice: Invoice): Promise<Blob> {
  return pdf(<InvoicePdf invoice={invoice} />).toBlob();
}
