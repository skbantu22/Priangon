import mongoose from "mongoose";

import POSOrder from "@/models/posorder.model";
import SaleReturn from "@/models/SaleReturn.model";
import CustomerPayment from "@/models/CustomerPayment.model";
import { SHOWROOM, WAREHOUSE, applyStockChange, nextDocumentNumber } from "@/lib/stockService";
import { assertReturnLotsIntact, recordDamagedLots, removeReturnLots } from "@/lib/damagedStockService";
import { shopMatch } from "@/lib/branchScope";
import { escapeRegex } from "@/lib/escapeRegex";

/**
 * Sales returns, like 360's: goods come back from one POS invoice.
 *
 * A row can only take back what was sold on it and not yet returned. The
 * units go back into the branch the sale was made from; the return total
 * comes off what the customer owes, and cash handed back at once is a
 * "pay" customer payment. A returned IMEI can be sold again.
 *
 * A shop may also bring back broken units. They are credited like the rest,
 * but only the good ones go back on the shelf that can be sold from: the
 * broken ones are kept apart in Damaged Stock (lib/damagedStockService),
 * where each remembers the purchase and supplier it came from, so it can go
 * back to him or be written off. Their IMEI is not sold again, and their
 * cost stays in the cost of goods sold (it is a loss, not stock).
 */

const METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const saleLocation = (sale) =>
  sale.soldFrom === "WAREHOUSE" || !sale.showroomId
    ? { locationType: WAREHOUSE, locationId: null }
    : { locationType: SHOWROOM, locationId: String(sale.showroomId) };

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

/**
 * Rows that can still come back, found by product name, barcode, IMEI or
 * invoice number: for the Return sheet of the POS and of Telekhata, where
 * nobody opens one invoice first. Newest sale first; a customer's own
 * sales are listed even with nothing typed, anyone else's need a search.
 */
export async function returnableLines({ customerId, showroomId, q, limit = 60 } = {}) {
  const text = String(q || "").trim();
  const known = mongoose.isValidObjectId(customerId);
  if (!known && text.length < 2) return [];

  const regex = text ? new RegExp(escapeRegex(text), "i") : null;
  const match = { status: "completed", ...shopMatch(showroomId), ...(known && { customerId }) };
  if (regex) {
    match.$or = [{ orderNumber: regex }, { customerName: regex }, { phone: regex }, { "items.productName": regex }, { "items.imeis": regex }, { "items.barcode": regex }];
  }

  const sales = await POSOrder.find(match).sort({ createdAt: -1 }).limit(60).lean();
  if (!sales.length) return [];

  const returns = await SaleReturn.find({ saleId: { $in: sales.map((s) => s._id) }, deletedAt: null })
    .select("saleId items.line items.qty items.imeis")
    .lean();
  const back = new Map(); // "saleId:line" → { qty, imeis }
  for (const ret of returns) {
    for (const item of ret.items) {
      const key = `${ret.saleId}:${item.line}`;
      const row = back.get(key) || { qty: 0, imeis: [] };
      row.qty += item.qty;
      row.imeis.push(...(item.imeis || []));
      back.set(key, row);
    }
  }

  const rows = [];
  for (const sale of sales) {
    const saleHit = !regex || regex.test(sale.orderNumber) || regex.test(sale.customerName || "") || regex.test(sale.phone || "");
    // the invoice discount is shared across its rows, so a row is worth what was really charged
    const charged = Number(sale.subTotal) ? Math.min(1, Number(sale.total) / Number(sale.subTotal)) : 1;

    sale.items.forEach((item, line) => {
      const done = back.get(`${sale._id}:${line}`) || { qty: 0, imeis: [] };
      const returnable = item.qty - done.qty;
      if (returnable <= 0) return;

      const itemHit = regex && (regex.test(item.productName) || regex.test(item.barcode || "") || (item.imeis || []).some((imei) => regex.test(imei)));
      if (!saleHit && !itemHit) return;

      rows.push({
        saleId: String(sale._id),
        orderNumber: sale.orderNumber,
        date: sale.createdAt,
        customerName: sale.customerName,
        customerType: sale.customerType || "retail",
        line,
        productName: item.productName,
        color: item.color || "",
        size: item.size || "",
        price: item.price,
        charged,
        sold: item.qty,
        returned: done.qty,
        returnable,
        openImeis: (item.imeis || []).filter((imei) => !done.imeis.includes(imei)),
        hasImeis: (item.imeis || []).length > 0,
      });
    });
  }

  return rows.slice(0, limit);
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

    // of what comes back, some may be broken: a handset is marked by its IMEI
    let damagedQty = 0;
    let damagedImeis = [];
    if (item.imeis?.length) {
      damagedImeis = [...new Set((Array.isArray(raw.damagedImeis) ? raw.damagedImeis : []).map((s) => String(s).trim()).filter(Boolean))];
      const outsider = damagedImeis.find((imei) => !imeis.includes(imei));
      if (outsider) throw new Error(`IMEI ${outsider} is marked damaged but is not being returned`);
      damagedQty = damagedImeis.length;
    } else {
      damagedQty = Number(raw.damagedQty) || 0;
      if (!Number.isInteger(damagedQty) || damagedQty < 0 || damagedQty > qty) {
        throw new Error(`${item.productName}: damaged quantity must be between 0 and ${qty}`);
      }
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
      damagedQty,
      damagedImeis,
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
    const good = line.qty - line.damagedQty;

    // the good units go back on the shelf that can be sold from
    if (good > 0) {
      await applyStockChange({
        ...saleLocation(sale),
        productId: line.productId,
        variantId: line.variantId,
        delta: good,
        type: "RETURN",
        note: `Sale return ${ret.returnNumber} (${sale.orderNumber})`,
        createdBy,
        productName: line.productName,
      });
    }
  }

  // the broken ones are kept apart on the damaged shelf of the same place,
  // each lot knowing the purchase and supplier it came from
  await recordDamagedLots({ ret, place: saleLocation(sale) });

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
  const sale = await POSOrder.findById(ret.saleId).select("showroomId soldFrom").lean();
  const place = saleLocation(sale || {});

  // broken units that already went back to a supplier cannot be un-returned from here
  await assertReturnLotsIntact(ret);

  for (const line of ret.items) {
    const good = line.qty - (line.damagedQty || 0);

    if (good > 0) {
      await applyStockChange({
        ...place,
        productId: line.productId,
        variantId: line.variantId,
        delta: -good,
        type: "OUT",
        note: `Sale return ${ret.returnNumber} deleted`,
        createdBy,
        productName: line.productName,
      });
    }
  }

  if (ret.refundPaymentId) {
    await CustomerPayment.updateOne({ _id: ret.refundPaymentId, deletedAt: null }, { $set: { deletedAt: new Date() } });
  }

  await removeReturnLots(ret);

  ret.deletedAt = new Date();
  await ret.save();
}

/** How many times each IMEI came back from a sale in good shape (so it can be sold again). A damaged one is not counted. */
export async function returnedImeiCounts(imeis) {
  if (!imeis.length) return new Map();
  const rows = await SaleReturn.aggregate([
    { $match: { deletedAt: null, "items.imeis": { $in: imeis } } },
    { $unwind: "$items" },
    { $unwind: "$items.imeis" },
    { $match: { "items.imeis": { $in: imeis } } },
    { $match: { $expr: { $not: [{ $in: ["$items.imeis", { $ifNull: ["$items.damagedImeis", []] }] }] } } },
    { $group: { _id: "$items.imeis", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}
