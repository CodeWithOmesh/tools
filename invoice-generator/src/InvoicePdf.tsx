import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { calculateInvoice, decimal, formatMoney } from "./money";
import type { Invoice } from "./types";

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
  business: { fontSize: 15, fontWeight: 700, marginBottom: 5 },
  muted: { color: "#687386", lineHeight: 1.5 },
  invoiceTitle: { fontSize: 29, letterSpacing: 1.5, color: "#141a24", textAlign: "right" },
  meta: { marginTop: 8, textAlign: "right", color: "#687386", lineHeight: 1.7 },
  goldRule: { height: 3, backgroundColor: "#e9a82e", marginBottom: 25 },
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
  summary: { width: 220 },
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
    fontSize: 13,
    fontWeight: 700,
    color: "#141a24",
  },
  balance: { color: "#a56c10", fontWeight: 700 },
  footer: { marginTop: 34, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e9edf2" },
  footerTitle: { fontSize: 8, fontWeight: 700, marginBottom: 5 },
  block: { marginBottom: 13 },
  note: { color: "#687386", lineHeight: 1.5 },
  thank: { marginTop: 22, textAlign: "center", color: "#87909e", fontSize: 8 },
});

export default function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const totals = calculateInvoice(invoice);
  const date = (value: string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("en", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
  const partyLines = (party: Invoice["seller"]) =>
    [party.address, party.email, party.phone, party.taxId ? `Tax ID: ${party.taxId}` : ""].filter(
      Boolean,
    );
  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={invoice.seller.name || "Code with Omesh"}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.brand}>
            {invoice.seller.logoDataUrl ? (
              <Image src={invoice.seller.logoDataUrl} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.business}>{invoice.seller.name || "Your business"}</Text>
              {partyLines(invoice.seller).map((line, i) => (
                <Text key={i} style={styles.muted}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.meta}>
              No. {invoice.invoiceNumber || "—"}
              {"\n"}Issued: {date(invoice.issueDate)}
              {"\n"}Due: {date(invoice.dueDate)}
            </Text>
          </View>
        </View>
        <View style={styles.goldRule} />
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>BILL TO</Text>
            <Text style={styles.partyName}>{invoice.client.name || "Client name"}</Text>
            {partyLines(invoice.client).map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>PAYMENT STATUS</Text>
            <Text style={styles.partyName}>{totals.status.toUpperCase()}</Text>
            <Text style={styles.muted}>Currency: {invoice.currency}</Text>
          </View>
        </View>
        <View style={styles.table}>
          <View style={styles.head}>
            <Text style={styles.desc}>DESCRIPTION</Text>
            <Text style={styles.qty}>QTY</Text>
            <Text style={styles.rate}>UNIT PRICE</Text>
            <Text style={styles.amount}>AMOUNT</Text>
          </View>
          {invoice.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.desc}>{item.description || "—"}</Text>
              <Text style={styles.qty}>{item.quantity || "0"}</Text>
              <Text style={styles.rate}>{formatMoney(item.unitPrice, invoice.currency)}</Text>
              <Text style={styles.amount}>
                {formatMoney(
                  decimal(item.quantity).times(decimal(item.unitPrice)),
                  invoice.currency,
                )}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.summaryWrap}>
          <View style={styles.summary}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(totals.subtotal, invoice.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>−{formatMoney(totals.discount, invoice.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>{invoice.taxLabel || "Tax"}</Text>
              <Text>{formatMoney(totals.tax, invoice.currency)}</Text>
            </View>
            <View style={styles.totalFinal}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(totals.total, invoice.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Amount paid</Text>
              <Text>{formatMoney(totals.amountPaid, invoice.currency)}</Text>
            </View>
            <View style={[styles.totalRow, styles.balance]}>
              <Text>AMOUNT DUE</Text>
              <Text>{formatMoney(totals.amountDue, invoice.currency)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          {invoice.paymentDetails ? (
            <View style={styles.block}>
              <Text style={styles.footerTitle}>PAYMENT DETAILS</Text>
              <Text style={styles.note}>{invoice.paymentDetails}</Text>
            </View>
          ) : null}
          {invoice.notes ? (
            <View style={styles.block}>
              <Text style={styles.footerTitle}>NOTES</Text>
              <Text style={styles.note}>{invoice.notes}</Text>
            </View>
          ) : null}
          {invoice.terms ? (
            <View style={styles.block}>
              <Text style={styles.footerTitle}>TERMS & CONDITIONS</Text>
              <Text style={styles.note}>{invoice.terms}</Text>
            </View>
          ) : null}
        </View>
        {invoice.footer ? <Text style={styles.thank}>{invoice.footer}</Text> : null}
      </Page>
    </Document>
  );
}
