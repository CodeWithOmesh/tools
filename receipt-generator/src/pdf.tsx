// Loaded on demand so the large PDF renderer is not part of the initial page download.
import { pdf } from "@react-pdf/renderer";
import ReceiptPdf from "./ReceiptPdf";
import type { Receipt } from "./types";

export function createReceiptPdf(receipt: Receipt): Promise<Blob> {
  return pdf(<ReceiptPdf receipt={receipt} />).toBlob();
}
