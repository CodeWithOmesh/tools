// Loaded on demand so the PDF renderer is not part of the initial page download.
import { pdf } from "@react-pdf/renderer";
import PayslipPdf from "./PayslipPdf";
import type { Payslip } from "./types";

export function createPayslipPdf(payslip: Payslip): Promise<Blob> {
  return pdf(<PayslipPdf payslip={payslip} />).toBlob();
}
