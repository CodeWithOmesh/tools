import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PaymentStatus, Receipt } from "./types";
import { calculate, dec, pdfMoney as money } from "./money";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "PAID IN FULL",
  partial: "PARTIALLY PAID",
  unpaid: "UNPAID",
};

const THERMAL_WIDTH = { "thermal-80": 227, "thermal-58": 164 } as const;

export default function ReceiptPdf({ receipt: r }: { receipt: Receipt }) {
  const t = calculate(r);
  const thermal = r.paperSize !== "a4";
  // Thermal receipts are one continuous roll: give the page a width only, so its height
  // grows to fit the content instead of spilling onto extra pages.
  const size = r.paperSize === "a4" ? "A4" : { width: THERMAL_WIDTH[r.paperSize] };
  const pad = thermal ? (r.paperSize === "thermal-58" ? 10 : 15) : 42;
  // On A4, keep rows and boxes from splitting across pages. Thermal pages never paginate.
  const keepTogether = thermal ? {} : { wrap: false };
  const accentColor = r.template === "professional" ? "#bd8429" : "#202938";

  const s = StyleSheet.create({
    page: {
      padding: pad,
      fontSize: thermal ? 8 : 9,
      color: "#202938",
      fontFamily: "Helvetica",
      lineHeight: 1.4,
    },
    top: {
      flexDirection: thermal ? "column" : "row",
      justifyContent: "space-between",
      alignItems: thermal ? "center" : "flex-start",
      marginBottom: 14,
    },
    business: thermal ? { alignItems: "center", marginBottom: 10 } : { flex: 1, paddingRight: 16 },
    logo: { width: 44, height: 44, objectFit: "contain", marginBottom: 6 },
    name: {
      fontSize: thermal ? 12 : 16,
      lineHeight: 1.25,
      fontFamily: "Helvetica-Bold",
      marginBottom: 4,
      textAlign: thermal ? "center" : "left",
    },
    muted: { color: "#687386", fontSize: 7, marginTop: 2, textAlign: thermal ? "center" : "left" },
    heading: { alignItems: thermal ? "center" : "flex-end" },
    title: { fontSize: thermal ? 10 : 16, lineHeight: 1.25, fontFamily: "Helvetica-Bold" },
    number: { fontSize: 8, color: "#687386", marginTop: 4 },
    accent: { height: 3, backgroundColor: "#d89a2b", marginBottom: 13 },
    info: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#e5e9ef",
      paddingTop: 9,
      paddingBottom: 4,
      marginBottom: 13,
    },
    infoCell: { width: thermal ? "100%" : "50%", marginBottom: 5 },
    label: { fontSize: 6, color: "#687386", letterSpacing: 0.5, marginBottom: 2 },
    value: { fontSize: 8, fontFamily: "Helvetica-Bold" },
    thead: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 6,
      backgroundColor: r.template === "professional" ? "#18283d" : "#f0f2f5",
      color: r.template === "professional" ? "#fff" : "#202938",
    },
    th: { fontSize: 7, fontFamily: "Helvetica-Bold" },
    desc: { flex: 1, paddingRight: 6 },
    qty: { width: 42, textAlign: "right" },
    price: { width: 75, textAlign: "right" },
    amt: { width: 80, textAlign: "right" },
    row: {
      flexDirection: thermal ? "column" : "row",
      paddingVertical: thermal ? 5 : 7,
      paddingHorizontal: thermal ? 0 : 6,
      borderBottomWidth: 1,
      borderColor: "#e5e9ef",
    },
    cell: { fontSize: 7 },
    thermalDetail: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
    bottom: {
      flexDirection: thermal ? "column" : "row",
      justifyContent: "space-between",
      marginTop: 13,
    },
    payment: thermal ? { marginBottom: 10 } : { flex: 1, paddingRight: 16 },
    totals: { width: thermal ? "100%" : "48%" },
    line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    totalLine: { borderTopWidth: 1, borderColor: "#e5e9ef", marginTop: 4, paddingTop: 7 },
    grand: {
      fontSize: thermal ? 11 : 13,
      lineHeight: 1.25,
      fontFamily: "Helvetica-Bold",
      color: accentColor,
    },
    note: { marginTop: 12, padding: 8, backgroundColor: "#f3f5f7", fontSize: 7 },
    thank: { marginTop: 18, textAlign: "center", fontSize: 9, fontFamily: "Helvetica-Bold" },
    foot: { marginTop: 8, textAlign: "center", color: "#8791a0", fontSize: 6 },
  });

  const method = r.paymentMethod.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const contact = [r.business.phone, r.business.email, r.business.website]
    .filter(Boolean)
    .join(" · ");
  const customerContact = [r.customer.phone, r.customer.email].filter(Boolean).join(" · ");
  const lineTotal = (quantity: string, unitPrice: string) =>
    money(dec(quantity || 0).times(dec(unitPrice || 0)), r.currency);

  return (
    <Document
      title={`Receipt ${r.receiptNumber}`}
      author={r.business.name || "Code with Omesh"}
      creator="Code with Omesh Receipt Generator"
    >
      <Page size={size} style={s.page} wrap={!thermal}>
        <View style={s.top}>
          <View style={s.business}>
            {r.business.logoDataUrl ? <Image src={r.business.logoDataUrl} style={s.logo} /> : null}
            <Text style={s.name}>{r.business.name || "Your Business Name"}</Text>
            {r.business.address ? <Text style={s.muted}>{r.business.address}</Text> : null}
            {contact ? <Text style={s.muted}>{contact}</Text> : null}
            {r.business.taxNumber ? (
              <Text style={s.muted}>Tax ID: {r.business.taxNumber}</Text>
            ) : null}
          </View>
          <View style={s.heading}>
            <Text style={s.title}>PAYMENT RECEIPT</Text>
            <Text style={s.number}>{r.receiptNumber}</Text>
          </View>
        </View>

        {r.template === "professional" ? <View style={s.accent} /> : null}

        <View style={s.info}>
          <View style={s.infoCell}>
            <Text style={s.label}>RECEIPT DATE</Text>
            <Text style={s.value}>
              {r.date}
              {r.time ? ` · ${r.time}` : ""}
            </Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.label}>PAYMENT STATUS</Text>
            <Text style={s.value}>{STATUS_LABELS[t.status]}</Text>
          </View>
          {r.customer.name ? (
            <View style={s.infoCell}>
              <Text style={s.label}>RECEIVED FROM</Text>
              <Text style={s.value}>{r.customer.name}</Text>
              {r.customer.address ? <Text style={s.muted}>{r.customer.address}</Text> : null}
            </View>
          ) : null}
          {customerContact ? (
            <View style={s.infoCell}>
              <Text style={s.label}>CUSTOMER CONTACT</Text>
              <Text style={s.value}>{customerContact}</Text>
            </View>
          ) : null}
        </View>

        {thermal ? (
          <View style={s.thead}>
            <Text style={s.th}>Item</Text>
            <Text style={s.th}>Amount</Text>
          </View>
        ) : (
          <View style={s.thead}>
            <Text style={[s.th, s.desc]}>Description</Text>
            <Text style={[s.th, s.qty]}>Qty</Text>
            <Text style={[s.th, s.price]}>Unit price</Text>
            <Text style={[s.th, s.amt]}>Amount</Text>
          </View>
        )}

        {r.items.map((item) =>
          thermal ? (
            <View style={s.row} key={item.id} {...keepTogether}>
              <Text style={s.cell}>{item.description || "Item"}</Text>
              <View style={s.thermalDetail}>
                <Text style={s.cell}>
                  {item.quantity} × {money(item.unitPrice || 0, r.currency)}
                </Text>
                <Text style={s.cell}>{lineTotal(item.quantity, item.unitPrice)}</Text>
              </View>
            </View>
          ) : (
            <View style={s.row} key={item.id} {...keepTogether}>
              <Text style={[s.cell, s.desc]}>{item.description || "Item"}</Text>
              <Text style={[s.cell, s.qty]}>{item.quantity}</Text>
              <Text style={[s.cell, s.price]}>{money(item.unitPrice || 0, r.currency)}</Text>
              <Text style={[s.cell, s.amt]}>{lineTotal(item.quantity, item.unitPrice)}</Text>
            </View>
          ),
        )}

        <View style={s.bottom} {...keepTogether}>
          <View style={s.payment}>
            <Text style={s.label}>PAYMENT METHOD</Text>
            <Text style={s.value}>{method}</Text>
            {r.transactionReference ? (
              <Text style={s.muted}>Reference: {r.transactionReference}</Text>
            ) : null}
          </View>
          <View style={s.totals}>
            <View style={s.line}>
              <Text>Subtotal</Text>
              <Text>{money(t.subtotal, r.currency)}</Text>
            </View>
            {t.discount.gt(0) ? (
              <View style={s.line}>
                <Text>Discount</Text>
                <Text>-{money(t.discount, r.currency)}</Text>
              </View>
            ) : null}
            {t.tax.gt(0) ? (
              <View style={s.line}>
                <Text>{r.tax.label || "Tax"}</Text>
                <Text>{money(t.tax, r.currency)}</Text>
              </View>
            ) : null}
            <View style={[s.line, s.totalLine]}>
              <Text style={s.grand}>Total</Text>
              <Text style={s.grand}>{money(t.total, r.currency)}</Text>
            </View>
            <View style={s.line}>
              <Text>Amount paid</Text>
              <Text>{money(t.amountPaid, r.currency)}</Text>
            </View>
            {t.changeDue.gt(0) ? (
              <View style={s.line}>
                <Text>Change given</Text>
                <Text>{money(t.changeDue, r.currency)}</Text>
              </View>
            ) : (
              <View style={s.line}>
                <Text>Balance due</Text>
                <Text>{money(t.balanceDue, r.currency)}</Text>
              </View>
            )}
          </View>
        </View>

        {r.notes ? (
          <View style={s.note} {...keepTogether}>
            <Text style={s.label}>NOTES</Text>
            <Text>{r.notes}</Text>
          </View>
        ) : null}
        {r.terms ? (
          <View style={s.note} {...keepTogether}>
            <Text style={s.label}>TERMS & CONDITIONS</Text>
            <Text>{r.terms}</Text>
          </View>
        ) : null}
        <Text style={s.thank}>{r.footer || "Thank you for your business!"}</Text>
        <Text style={s.foot}>Created with Code with Omesh · codewithomesh.com</Text>
      </Page>
    </Document>
  );
}
