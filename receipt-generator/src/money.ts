import Decimal from "decimal.js";
import type {Receipt,Totals} from "./types";
Decimal.set({precision:40,rounding:Decimal.ROUND_HALF_UP});
export function dec(value:string|number|Decimal|undefined|null){try{return value===undefined||value===null||value===""?new Decimal(0):new Decimal(value)}catch{return new Decimal(0)}}
export function currencyDigits(currency:string){try{return new Intl.NumberFormat("en",{style:"currency",currency}).resolvedOptions().maximumFractionDigits ?? 2}catch{return 2}}
export function roundMoney(value:Decimal,currency:string){return value.toDecimalPlaces(currencyDigits(currency),Decimal.ROUND_HALF_UP)}
export function money(value:Decimal|string|number,currency:string,locale="en-US"){const rounded=roundMoney(dec(value),currency),digits=currencyDigits(currency);try{return new Intl.NumberFormat(locale,{style:"currency",currency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(rounded.toFixed(digits)))}catch{return currency+" "+rounded.toFixed(digits)}}
export function calculate(receipt:Receipt):Totals{
 const subtotal=roundMoney(receipt.items.reduce((sum,item)=>{const q=dec(item.quantity),p=dec(item.unitPrice);return q.isNegative()||p.isNegative()?sum:sum.plus(q.times(p))},new Decimal(0)),receipt.currency);
 const discountRaw=receipt.discount.type==="percentage"?subtotal.times(dec(receipt.discount.value)).div(100):dec(receipt.discount.value);
 const discount=roundMoney(Decimal.max(0,Decimal.min(subtotal,discountRaw)),receipt.currency);
 const taxableAmount=roundMoney(Decimal.max(0,subtotal.minus(discount)),receipt.currency);
 const taxRaw=receipt.tax.type==="percentage"?taxableAmount.times(dec(receipt.tax.value)).div(100):dec(receipt.tax.value);
 const tax=roundMoney(Decimal.max(0,taxRaw),receipt.currency),total=roundMoney(taxableAmount.plus(tax),receipt.currency);
 const amountPaid=roundMoney(Decimal.max(0,dec(receipt.amountPaid)),receipt.currency);
 const balanceDue=roundMoney(Decimal.max(0,total.minus(amountPaid)),receipt.currency),changeDue=roundMoney(Decimal.max(0,amountPaid.minus(total)),receipt.currency);
 const status=total.lte(0)||amountPaid.lte(0)?"unpaid":amountPaid.gte(total)?"paid":"partial";
 return {subtotal,discount,taxableAmount,tax,total,amountPaid,balanceDue,changeDue,status};
}