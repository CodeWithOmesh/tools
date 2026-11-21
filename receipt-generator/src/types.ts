import type Decimal from "decimal.js";
export type Template="simple"|"professional";
export type PaperSize="a4"|"thermal-80"|"thermal-58";
export type AdjustmentType="fixed"|"percentage";
export type PaymentMethod="cash"|"credit_card"|"debit_card"|"bank_transfer"|"mobile_payment"|"cheque"|"other";
export type PaymentStatus="paid"|"partial"|"unpaid";
export interface Item{id:string;description:string;quantity:string;unitPrice:string}
export interface Business{name:string;logoDataUrl?:string;address:string;phone:string;email:string;website:string;taxNumber:string}
export interface Customer{name:string;phone:string;email:string;address:string}
export interface Adjustment{type:AdjustmentType;value:string}
export interface Receipt{receiptNumber:string;date:string;time:string;currency:string;business:Business;customer:Customer;items:Item[];discount:Adjustment;tax:Adjustment&{label:string};amountPaid:string;paymentMethod:PaymentMethod;transactionReference:string;notes:string;terms:string;footer:string;template:Template;paperSize:PaperSize}
export interface Totals{subtotal:Decimal;discount:Decimal;taxableAmount:Decimal;tax:Decimal;total:Decimal;amountPaid:Decimal;balanceDue:Decimal;changeDue:Decimal;status:PaymentStatus}