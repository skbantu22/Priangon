import mongoose from "mongoose";

import POSOrder from "@/models/posorder.model";
import SaleReturn from "@/models/SaleReturn.model";
import CustomerPayment from "@/models/CustomerPayment.model";
import { SHOWROOM, WAREHOUSE, applyStockChange, nextDocumentNumber } from "@/lib/stockService";

/**
 * Sales returns, like 360's: goods come back from one POS invoice.
 *
 * A row can only take back what was sold on it and not yet returned. The
 * units go back into the branch the sale was made from; the return total
 * comes off what the customer owes, and cash handed back at once is a
 * "pay" customer payment. A returned IMEI can be sold again.
 */

const METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const saleLocation = (sale) =>
  sale.showroomId
    ? { locationType: SHOWROOM, locationId: String(sale.showroomId) }
    : { locationType: WAREHOUSE, locationId: null };

/** Units already returned per sale row: Map(line → { qty, imeis }) */
async function returnedByLine(saleId) {
  const returns = await SaleReturn.find({ saleId, deletedAt: null }).select("items.line items.qty items.imeis").lean();
  const byLine = new Map();
  for (const ret of returns) {
    for (const item of ret.items) {
      const row = byLine.get(item.line) || { qty: 0, imeis: [] };
      row.qty += item.qty;
      row.imeis.push(...(item.imeis || []));
      byLine.set(item.line, row);
    }
  }
  return byLine;
}

/** A sale with, per row, what was sold, what came back and what can still come back */
export async function returnableSale(saleId) {
  if (!mongoose.isValidObjectId(saleId)) return null;

  const sale = await POSOrder.findOne({ _id: saleId, status: "completed" }).lean();
  if (!sale) return null;

  const returned = await returnedByLine(sale._id);

  return {
    ...sale,
    items: sale.items.map((item, line) => {
      const back = returned.get(line) || { qty: 0, imeis: [] };
      return {
        ...item,
        line,
        returnedQty: back.qty,
        returnable: Math.max(0, item.qty - back.qty),
        // handsets still out with the customer
        openImeis: (item.imeis || []).filter((imei) => !back.imeis.includes(imei)),
      };
    }),
  };
}

/** Saves a return, puts the goods back and records any refund. Throws with a message for the screen. */
export async function createSaleReturn(body, createdBy) {
  const sale = await returnableSale(body.saleId);
  if (!sale) throw new Error("Sale not found");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const lines = [];

  for (const raw of rawItems) {
    const qty = Number(raw?.qty);
    if (!qty) continue;

    const item = sale.items[Number(raw.line)];
    if (!item) throw new Error("A row of this sale no longer exists");
    if (!Number.isInteger(qty) || qty < 0) throw new Error(`${item.productName}: return quantity is invalid`);
    if (qty > item.returnable) throw new Error(`${item.productName}: only ${item.returnable} can be returned`);

    // a handset comes back by its IMEI
    const imeis = [...new Set((Array.isArray(raw.imeis) ? raw.imeis : []).map((s) => String(s).trim()).filter(Boolean))];
    if (item.imeis?.length) {
      if (imeis.length !== qty) throw new Error(`${item.productName}: choose ${qty} IMEI to take back`);
      const stranger = imeis.find((imei) => !item.openImeis.includes(imei));
      if (stranger) throw new Error(`IMEI ${stranger} was not sold on this invoice, or is already returned`);
    }

    lines.push({
      line: item.line,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      color: item.color || "",
      size: item.size || "",
      qty,
      price: item.price,
      purchasePrice: Number(item.purchasePrice) || 0,
      subtotal: round2(qty * item.price),
      imeis,
    });
  }

  if (!lines.length) throw new Error("Enter the quantity coming back");

  // an invoice discount is shared across its rows, so the refund value
  // is scaled by what was really charged
  const charged = Number(sale.subTotal) ? Number(sale.total) / Number(sale.subTotal) : 1;
  const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0) * Math.min(1, charged));

  const refundAmount = Math.max(0, round2(body.refundAmount));
  if (refundAmount - total > 0.009) throw new Error("Refund cannot be more than the return total");

  const refundMethod = METHODS.includes(body.refundMethod) ? body.refundMethod : "cash";
  const returnDate = body.returnDate ? new Date(`${String(body.returnDate).slice(0, 10)}T12:00:00+06:00`) : new Date();

  const ret = await SaleReturn.create({
    returnNumber: await nextDocumentNumber("SRT", "sale_return"),
    saleId: sale._id,
    orderNumber: sale.orderNumber,
    customerId: sale.customerId || null,
    customerName: sale.customerName,
    customerType: sale.customerType || "retail",
    phone: sale.phone || "",
    showroomId: sale.showroomId || null,
    returnDate,
    items: lines,
    total,
    refundAmount,
    refundMethod,
    note: String(body.note || "").trim().slice(0, 2000),
    createdBy,
  });

  for (const line of lines) {
    await applyStockChange({
      ...saleLocation(sale),
      productId: line.productId,
      variantId: line.variantId,
      delta: line.qty,
      type: "RETURN",
      note: `Sale return ${ret.returnNumber} (${sale.orderNumber})`,
      createdBy,
      productName: line.productName,
    });
  }

  // cash back to a known customer is a payment out, so their balance reads
  // due − return total + refund
  if (refundAmount > 0 && sale.customerId) {
    const payment = await CustomerPayment.create({
      invoiceNo: await nextDocumentNumber("CPY", "customer_pay"),
      customerId: sale.customerId,
      type: "pay",
      amount: refundAmount,
      method: refundMethod,
      date: returnDate,
      note: `Refund for return ${ret.returnNumber} (${sale.orderNumber})`,
      createdBy,
    });
    ret.refundPaymentId = payment._id;
    await ret.save();
  }

  return ret;
}

/** Undoes a return: the goods leave stock again and the refund is removed */
export async function deleteSaleReturn(ret, createdBy) {
  const sale = await POSOrder.findById(ret.saleId).select("showroomId").lean();

  for (const line of ret.items) {
    await applyStockChange({
      ...saleLocation(sale || {}),
      productId: line.productId,
      variantId: line.variantId,
      delta: -line.qty,
      type: "OUT",
      note: `Sale return ${ret.returnNumber} deleted`,
      createdBy,
      productName: line.productName,
    });
  }

  if (ret.refundPaymentId) {
    await CustomerPayment.updateOne({ _id: ret.refundPaymentId, deletedAt: null }, { $set: { deletedAt: new Date() } });
  }

  ret.deletedAt = new Date();
  await ret.save();
}

/** How many times each IMEI came back from a sale (so it can be sold again) */
export async function returnedImeiCounts(imeis) {
  if (!imeis.length) return new Map();
  const rows = await SaleReturn.aggregate([
    { $match: { deletedAt: null, "items.imeis": { $in: imeis } } },
    { $unwind: "$items" },
    { $unwind: "$items.imeis" },
    { $match: { "items.imeis": { $in: imeis } } },
    { $group: { _id: "$items.imeis", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}
