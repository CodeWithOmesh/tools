import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { calculateQuotation, decimal, formatMoneyForPdf as formatMoney } from "./money";
import type { PartyDetails, Quotation } from "./types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingHorizontal: 48,
    paddingBottom: 48,
    fontSize: 9,
    color: "#202633",
    fontFamily: "Helvetica",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 34,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, maxWidth: "55%" },
  logo: { width: 54, height: 54, objectFit: "contain" },
  business: { fontSize: 15, lineHeight: 1.25, fontWeight: 700, marginBottom: 5 },
  muted: { color: "#687386", lineHeight: 1.4 },
  heading: { alignItems: "flex-end" },
  quoteTitle: { fontSize: 26, lineHeight: 1.2, letterSpacing: 1.5, color: "#141a24" },
  meta: { color: "#687386", lineHeight: 1.4 },
  metaNumber: { marginTop: 6, marginBottom: 2, fontWeight: 700, color: "#444e5d" },
  goldRule: { height: 3, backgroundColor: "#e9a82e", marginBottom: 25 },
  simpleRule: { height: 1, backgroundColor: "#a5aab2", marginBottom: 25 },
  simpleHead: { backgroundColor: "#eef0f3", color: "#252d3a" },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  party: { width: "46%" },
  label: {
    fontSize: 7,
    color: "#8a93a2",
    letterSpacing: 1.3,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 5 },
  table: { marginTop: 5 },
  head: {
    flexDirection: "row",
    backgroundColor: "#171e2a",
    color: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 9,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e9edf2",
  },
  desc: { flex: 1 },
  qty: { width: 52, textAlign: "right" },
  rate: { width: 82, textAlign: "right" },
  amount: { width: 92, textAlign: "right" },
  summaryWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  summary: { width: 250 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    color: "#687386",
  },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    marginTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#cdd4de",
    gap: 12,
    fontSize: 12,
    fontWeight: 700,
    color: "#141a24",
  },
  footer: { marginTop: 34, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e9edf2" },
  footerTitle: { fontSize: 8, fontWeight: 700, marginBottom: 5 },
  block: { marginBottom: 13 },
  note: { color: "#687386", lineHeight: 1.5 },
  thank: { marginTop: 22, textAlign: "center", color: "#87909e", fontSize: 8 },
  estimateNote: { marginTop: 8, textAlign: "right", fontSize: 7, color: "#87909e" },
  acceptance: { marginTop: 24, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#d9dee6" },
  acceptanceTitle: { fontSize: 8, fontWeight: 700, letterSpacing: 1 },
  acceptanceText: { marginTop: 6, color: "#687386", fontSize: 8, lineHeight: 1.25 },
  signatureRow: { flexDirection: "row", gap: 18, marginTop: 28 },
  signatureCell: { flex: 1, borderTopWidth: 1, borderTopColor: "#8c96a5", paddingTop: 5 },
  signatureLabel: { fontSize: 7, color: "#687386" },
});

function dateLabel(value: string): string {
  return value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
}

function partyLines(party: PartyDetails): string[] {
  return [
    party.address,
    party.email,
    party.phone,
    party.taxId ? `Tax ID: ${party.taxId}` : "",
  ].filter(Boolean);
}

export default function QuotationPdf({ quotation }: { quotation: Quotation }) {
  const totals = calculateQuotation(quotation);
  const simple = quotation.template === "simple";
  const headingFont = simple ? "Times-Roman" : "Helvetica";
  const validDays =
    quotation.issueDate && quotation.validUntil
      ? Math.round(
          (Date.parse(`${quotation.validUntil}T00:00:00Z`) -
            Date.parse(`${quotation.issueDate}T00:00:00Z`)) /
            86_400_000,
        )
      : null;

  return (
    <Document
      title={`Quotation ${quotation.quoteNumber}`}
      author={quotation.business.name || "Code with Omesh"}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.brand}>
            {quotation.business.logoDataUrl ? (
              <Image src={quotation.business.logoDataUrl} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.business}>{quotation.business.name || "Your business"}</Text>
              {partyLines(quotation.business).map((line, index) => (
                <Text key={index} style={styles.muted}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.heading}>
            <Text style={[styles.quoteTitle, { fontFamily: headingFont }]}>QUOTATION</Text>
            <Text style={[styles.meta, styles.metaNumber]}>No. {quotation.quoteNumber || "—"}</Text>
            <Text style={styles.meta}>Issued: {dateLabel(quotation.issueDate)}</Text>
            <Text style={styles.meta}>Valid until: {dateLabel(quotation.validUntil)}</Text>
          </View>
        </View>

        <View style={simple ? styles.simpleRule : styles.goldRule} />

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>QUOTE FOR</Text>
            <Text style={styles.partyName}>{quotation.client.name || "Client name"}</Text>
            {partyLines(quotation.client).map((line, index) => (
              <Text key={index} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>QUOTE DETAILS</Text>
            <Text style={styles.partyName}>Currency: {quotation.currency}</Text>
            {validDays !== null ? (
              <Text style={styles.muted}>
                Valid for {validDays} {validDays === 1 ? "day" : "days"} from the issue date
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={simple ? [styles.head, styles.simpleHead] : styles.head}>
            <Text style={styles.desc}>DESCRIPTION</Text>
            <Text style={styles.qty}>QTY</Text>
            <Text style={styles.rate}>UNIT PRICE</Text>
            <Text style={styles.amount}>AMOUNT</Text>
          </View>
          {quotation.items.map((item) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={styles.desc}>{item.description || "—"}</Text>
              <Text style={styles.qty}>{item.quantity || "0"}</Text>
              <Text style={styles.rate}>{formatMoney(item.unitPrice, quotation.currency)}</Text>
              <Text style={styles.amount}>
                {formatMoney(
                  decimal(item.quantity).times(decimal(item.unitPrice)),
                  quotation.currency,
                )}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryWrap} wrap={false}>
          <View style={styles.summary}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(totals.subtotal, quotation.currency)}</Text>
            </View>
            {totals.discount.gt(0) ? (
              <View style={styles.totalRow}>
                <Text>Discount</Text>
                <Text>-{formatMoney(totals.discount, quotation.currency)}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text>{quotation.taxLabel || "Tax"}</Text>
              <Text>{formatMoney(totals.tax, quotation.currency)}</Text>
            </View>
            <View style={styles.totalFinal}>
              <Text>ESTIMATED TOTAL</Text>
              <Text>{formatMoney(totals.total, quotation.currency)}</Text>
            </View>
            <Text style={styles.estimateNote}>This quotation is an estimate, not an invoice.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {quotation.scopeOfWork ? (
            <View style={styles.block}>
              <Text style={styles.footerTitle} minPresenceAhead={30}>
                SCOPE OF WORK
              </Text>
              <Text style={styles.note}>{quotation.scopeOfWork}</Text>
            </View>
          ) : null}
          {quotation.terms ? (
            <View style={styles.block}>
              <Text style={styles.footerTitle} minPresenceAhead={30}>
                TERMS & CONDITIONS
              </Text>
              <Text style={styles.note}>{quotation.terms}</Text>
            </View>
          ) : null}
          {quotation.notes ? (
            <View style={styles.block}>
              <Text style={styles.footerTitle} minPresenceAhead={30}>
                NOTES
              </Text>
              <Text style={styles.note}>{quotation.notes}</Text>
            </View>
          ) : null}
        </View>

        {quotation.showAcceptance ? (
          <View style={styles.acceptance} wrap={false}>
            <Text style={styles.acceptanceTitle}>ACCEPTANCE</Text>
            <Text style={styles.acceptanceText}>
              By signing below, I accept this quotation and its terms.
            </Text>
            <View style={styles.signatureRow}>
              <View style={styles.signatureCell}>
                <Text style={styles.signatureLabel}>Name</Text>
              </View>
              <View style={styles.signatureCell}>
                <Text style={styles.signatureLabel}>Signature</Text>
              </View>
              <View style={styles.signatureCell}>
                <Text style={styles.signatureLabel}>Date</Text>
              </View>
            </View>
          </View>
        ) : null}

        {quotation.footer ? <Text style={styles.thank}>{quotation.footer}</Text> : null}
      </Page>
    </Document>
  );
}
