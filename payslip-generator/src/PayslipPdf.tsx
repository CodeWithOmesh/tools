import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { companyLines, detailRows, periodLabel } from "./format";
import {
  amountInWords,
  calculatePayslip,
  formatMoneyForPdf as formatMoney,
  lineBasis,
  type LineAmount,
} from "./money";
import type { Payslip } from "./types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 46,
    paddingBottom: 46,
    fontSize: 9,
    color: "#202633",
    fontFamily: "Helvetica",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 20,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, maxWidth: "62%" },
  logo: { width: 52, height: 52, objectFit: "contain" },
  company: { fontSize: 14, lineHeight: 1.25, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#687386", lineHeight: 1.45, fontSize: 8 },
  heading: { alignItems: "flex-end" },
  title: { fontSize: 24, lineHeight: 1.2, letterSpacing: 1.5, color: "#141a24" },
  period: { marginTop: 5, fontFamily: "Helvetica-Bold", color: "#444e5d", fontSize: 10 },
  goldRule: { height: 3, backgroundColor: "#e9a82e", marginBottom: 20 },
  simpleRule: { height: 1, backgroundColor: "#a5aab2", marginBottom: 20 },
  employee: { marginBottom: 18 },
  label: { fontSize: 7, color: "#8a93a2", letterSpacing: 1.3, marginBottom: 5 },
  employeeName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 9 },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#e9edf2",
  },
  detail: {
    width: "50%",
    flexDirection: "row",
    paddingVertical: 5,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e9edf2",
  },
  detailLabel: { width: 78, color: "#7b8492", fontSize: 8 },
  detailValue: { flex: 1, color: "#252d3a", fontSize: 8 },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#e1e6ed" },
  head: { flexDirection: "row", backgroundColor: "#171e2a", color: "#fff" },
  simpleHead: { backgroundColor: "#eef0f3", color: "#252d3a" },
  headCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#eef1f5" },
  cell: { paddingVertical: 7, paddingHorizontal: 8 },
  name: { width: "32%" },
  money: { width: "18%", textAlign: "right" },
  divider: { borderLeftWidth: 1, borderLeftColor: "#e1e6ed" },
  basis: { color: "#8a93a2", fontSize: 7 },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#cdd4de",
    backgroundColor: "#f6f7f9",
  },
  bold: { fontFamily: "Helvetica-Bold", color: "#141a24" },
  netBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#171e2a",
    color: "#fff",
  },
  simpleNet: {
    backgroundColor: "#f1f3f6",
    color: "#141a24",
    borderWidth: 1,
    borderColor: "#cdd4de",
  },
  netLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  netSub: { fontSize: 7, marginTop: 2, opacity: 0.7 },
  netAmount: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  words: { marginTop: 7, color: "#46505e", fontSize: 8, fontFamily: "Helvetica-Oblique" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 7, color: "#8a93a2", letterSpacing: 1.3, marginBottom: 6 },
  employerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f5",
    width: "60%",
  },
  note: { color: "#687386", lineHeight: 1.5 },
  signatureRow: { flexDirection: "row", gap: 40, marginTop: 44 },
  signatureCell: { flex: 1, borderTopWidth: 1, borderTopColor: "#8c96a5", paddingTop: 5 },
  signatureLabel: { fontSize: 7, color: "#687386" },
  footer: { marginTop: 26, textAlign: "center", color: "#87909e", fontSize: 7.5 },
});

function LineName({ item }: { item: LineAmount | undefined }) {
  if (!item) return null;
  const basis = lineBasis(item.line);
  return (
    <Text>
      {item.line.label}
      {basis ? <Text style={styles.basis}>{`  (${basis})`}</Text> : null}
    </Text>
  );
}

export default function PayslipPdf({ payslip }: { payslip: Payslip }) {
  const totals = calculatePayslip(payslip);
  const simple = payslip.template === "simple";
  const money = (value: LineAmount["amount"]) => formatMoney(value, payslip.currency);
  const earnings: LineAmount[] = [
    {
      line: { id: "basic", label: "Basic salary", mode: "amount", value: "" },
      amount: totals.basic,
    },
    ...totals.earnings,
  ];
  const rows = Math.max(earnings.length, totals.deductions.length);
  const details = detailRows(payslip);
  const period = periodLabel(payslip);

  return (
    <Document
      title={`Payslip ${payslip.employee.name} ${period}`.trim()}
      author={payslip.company.name || "Code with Omesh"}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.brand}>
            {payslip.company.logoDataUrl ? (
              <Image src={payslip.company.logoDataUrl} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.company}>{payslip.company.name}</Text>
              {companyLines(payslip).map((line, index) => (
                <Text key={index} style={styles.muted}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.heading}>
            <Text style={[styles.title, { fontFamily: simple ? "Times-Roman" : "Helvetica" }]}>
              PAYSLIP
            </Text>
            {period ? <Text style={styles.period}>{period}</Text> : null}
            {payslip.slipNumber.trim() ? (
              <Text style={styles.muted}>No. {payslip.slipNumber.trim()}</Text>
            ) : null}
          </View>
        </View>

        <View style={simple ? styles.simpleRule : styles.goldRule} />

        <View style={styles.employee}>
          <Text style={styles.label}>EMPLOYEE</Text>
          <Text style={styles.employeeName}>{payslip.employee.name}</Text>
          {details.length ? (
            <View style={styles.details}>
              {details.map((row) => (
                <View key={row.label} style={styles.detail}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={simple ? [styles.head, styles.simpleHead] : styles.head}>
            <Text style={[styles.headCell, styles.name]}>EARNINGS</Text>
            <Text style={[styles.headCell, styles.money]}>AMOUNT</Text>
            <Text style={[styles.headCell, styles.name, styles.divider]}>DEDUCTIONS</Text>
            <Text style={[styles.headCell, styles.money]}>AMOUNT</Text>
          </View>
          {Array.from({ length: rows }, (_, index) => {
            const earning = earnings[index];
            const deduction = totals.deductions[index];
            return (
              <View key={index} style={styles.row} wrap={false}>
                <View style={[styles.cell, styles.name]}>
                  <LineName item={earning} />
                </View>
                <Text style={[styles.cell, styles.money]}>
                  {earning ? money(earning.amount) : ""}
                </Text>
                <View style={[styles.cell, styles.name, styles.divider]}>
                  <LineName item={deduction} />
                </View>
                <Text style={[styles.cell, styles.money]}>
                  {deduction ? money(deduction.amount) : ""}
                </Text>
              </View>
            );
          })}
          <View style={styles.totalRow} wrap={false}>
            <Text style={[styles.cell, styles.name, styles.bold]}>Gross earnings</Text>
            <Text style={[styles.cell, styles.money, styles.bold]}>{money(totals.gross)}</Text>
            <Text style={[styles.cell, styles.name, styles.divider, styles.bold]}>
              Total deductions
            </Text>
            <Text style={[styles.cell, styles.money, styles.bold]}>
              {money(totals.totalDeductions)}
            </Text>
          </View>
        </View>

        <View wrap={false}>
          <View style={simple ? [styles.netBand, styles.simpleNet] : styles.netBand}>
            <View>
              <Text style={styles.netLabel}>NET PAY</Text>
              <Text style={styles.netSub}>Gross earnings minus total deductions</Text>
            </View>
            <Text style={styles.netAmount}>{money(totals.net)}</Text>
          </View>
          {payslip.showInWords ? (
            <Text style={styles.words}>{amountInWords(totals.net, payslip.currency)}</Text>
          ) : null}
        </View>

        {totals.employer.length ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>EMPLOYER CONTRIBUTIONS (NOT DEDUCTED FROM PAY)</Text>
            {totals.employer.map((item) => (
              <View key={item.line.id} style={styles.employerRow}>
                <LineName item={item} />
                <Text>{money(item.amount)}</Text>
              </View>
            ))}
            <View style={[styles.employerRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.bold}>Total</Text>
              <Text style={styles.bold}>{money(totals.totalEmployer)}</Text>
            </View>
          </View>
        ) : null}

        {payslip.notes.trim() ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} minPresenceAhead={30}>
              NOTES
            </Text>
            <Text style={styles.note}>{payslip.notes}</Text>
          </View>
        ) : null}

        {payslip.showSignatures ? (
          <View style={styles.signatureRow} wrap={false}>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>Employer signature</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureLabel}>Employee signature</Text>
            </View>
          </View>
        ) : null}

        {payslip.footer.trim() ? <Text style={styles.footer}>{payslip.footer}</Text> : null}
      </Page>
    </Document>
  );
}
