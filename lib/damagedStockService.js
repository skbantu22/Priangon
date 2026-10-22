import mongoose from "mongoose";

import DamagedLot from "@/models/DamagedLot.model";
import Purchase from "@/models/Purchase.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import PurchaseReturnType from "@/models/PurchaseReturnType.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import { nextDocumentNumber } from "@/lib/stockService";
import { stockQtyOf, unitCostOf } from "@/lib/purchaseService";
import { shopMatch } from "@/lib/branchScope";
import { escapeRegex } from "@/lib/escapeRegex";

/**
 * The damaged shelf: broken units a customer brought back. They never touch
 * the stock that can be sold; a unit is either in Stock or in a damaged lot.
 *
 * Every lot knows the purchase it came from and until when that supplier
 * stands behind it, so from here a broken unit goes back to the supplier (a
 * purchase return, which takes it off what we owe him) or is written off.
 */

const METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const addMonths = (date, months) => {
  const day = new Date(date);
  day.setMonth(day.getMonth() + months);
  return day;
};

/** active = the supplier still stands behind it; expired = his time is over; none = no warranty was noted; nosource = no purchase on record */
export function warrantyState(lot, now = new Date()) {
  if (!lot.supplierId || !lot.purchaseId) return "nosource";
  if (!lot.warrantyUntil) return "none";
  return new Date(lot.warrantyUntil) >= now ? "active" : "expired";
}

/**
 * The purchase a broken unit most likely came from. A handset is found by its
 * IMEI; anything else by the oldest received purchase of that product that
 * still has units not sent back (the oldest goods are the ones sold first).
 */
async function findSource({ variantId, imei }) {
  const base = { deletedAt: null, status: "received" };
  const stillHere = (item) => String(item.variantId) === String(variantId) && stockQtyOf(item) - (Number(item.returnedQty) || 0) > 0;

  let purchase = null;
  let line = -1;

  if (imei) {
    purchase = await Purchase.findOne({ ...base, "items.imeis": imei }).sort({ purchaseDate: 1 }).lean();
    line = purchase ? purchase.items.findIndex((item) => (item.imeis || []).includes(imei)) : -1;
  }

  if (line < 0) {
    const candidates = await Purchase.find({ ...base, "items.variantId": variantId }).sort({ purchaseDate: 1, createdAt: 1 }).limit(30).lean();
    purchase = candidates.find((p) => p.items.some(stillHere)) || null;
    line = purchase ? purchase.items.findIndex(stillHere) : -1;
  }

  if (!purchase || line < 0) return null;

  const item = purchase.items[line];
  const months = Number(item.warrantyMonths) || 0;

  return {
    purchaseId: purchase._id,
    purchaseNumber: purchase.purchaseNumber,
    purchaseLine: line,
    purchaseDate: purchase.purchaseDate,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName || "",
    unitCost: unitCostOf(item),
    warrantyMonths: months,
    warrantyUntil: months ? addMonths(purchase.purchaseDate, months) : null,
  };
}

/** Puts the broken units of a saved sale return on the damaged shelf of the place they came back to */
export async function recordDamagedLots({ ret, place }) {
  for (const line of ret.items) {
    const damaged = Number(line.damagedQty) || 0;
    if (damaged <= 0) continue;

    // a handset is one lot per IMEI, anything else one lot for the row
    const units = line.damagedImeis?.length ? line.damagedImeis.map((imei) => ({ imei, qty: 1 })) : [{ imei: "", qty: damaged }];

    for (const unit of units) {
      const source = await findSource({ variantId: line.variantId, imei: unit.imei });

      await DamagedLot.create({
        showroomId: place.locationType === "SHOWROOM" ? place.locationId : null,
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        variantLabel: [line.color, line.size].filter(Boolean).join(" / "),
        imei: unit.imei,
        qty: unit.qty,
        left: unit.qty,
        saleReturnId: ret._id,
        returnNumber: ret.returnNumber,
        orderNumber: ret.orderNumber,
        customerId: ret.customerId || null,
        customerName: ret.customerName,
        receivedAt: ret.returnDate,
        // what the unit cost us, even when no purchase of it is on record
        unitCost: Number(line.purchasePrice) || 0,
        ...(source || {}),
      });
    }
  }
}

/** A sale return can be deleted only while none of its broken units has gone back or been written off */
export async function assertReturnLotsIntact(ret) {
  const used = await DamagedLot.exists({
    saleReturnId: ret._id,
    deletedAt: null,
    $expr: { $ne: ["$left", "$qty"] },
  });

  if (used) {
    throw new Error(`${ret.returnNumber}: some of its damaged units were already sent to the supplier or written off. Undo that first.`);
  }
}

export async function removeReturnLots(ret) {
  await DamagedLot.updateMany({ saleReturnId: ret._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
}

/** Lots for the Damaged Stock page and its report. Open ones by default. */
export async function listLots({ showroomId, q, supplierId, state, includeClosed = false } = {}) {
  const match = { deletedAt: null, ...shopMatch(showroomId) };
  if (!includeClosed) match.left = { $gt: 0 };
  if (mongoose.isValidObjectId(supplierId)) match.supplierId = supplierId;

  const text = String(q || "").trim();
  if (text) {
    const regex = new RegExp(escapeRegex(text), "i");
    match.$or = [{ productName: regex }, { imei: regex }, { customerName: regex }, { supplierName: regex }, { returnNumber: regex }, { purchaseNumber: regex }, { orderNumber: regex }];
  }

  const lots = await DamagedLot.find(match).sort({ receivedAt: -1, createdAt: -1 }).limit(1000).lean();
  const now = new Date();
  const rows = lots.map((lot) => ({ ...lot, state: warrantyState(lot, now) }));

  return state ? rows.filter((lot) => lot.state === state) : rows;
}

/** [{ lotId, qty }] from a form: whole numbers above 0, one entry per lot */
function readPicks(raw) {
  const picks = new Map();
  for (const pick of Array.isArray(raw) ? raw : []) {
    const qty = Number(pick?.qty);
    if (!mongoose.isValidObjectId(pick?.lotId) || !Number.isInteger(qty) || qty <= 0) continue;
    picks.set(String(pick.lotId), (picks.get(String(pick.lotId)) || 0) + qty);
  }
  return [...picks].map(([lotId, qty]) => ({ lotId, qty }));
}

async function loadPicks(raw) {
  const picks = readPicks(raw);
  if (!picks.length) throw new Error("Choose the damaged units first");

  const lots = await DamagedLot.find({ _id: { $in: picks.map((p) => p.lotId) }, deletedAt: null });
  const byId = new Map(lots.map((lot) => [String(lot._id), lot]));

  return picks.map(({ lotId, qty }) => {
    const lot = byId.get(lotId);
    if (!lot) throw new Error("A damaged lot no longer exists");
    if (qty > lot.left) throw new Error(`${lot.productName}${lot.imei ? ` ${lot.imei}` : ""}: only ${lot.left} on the damaged shelf`);
    return { lot, qty };
  });
}

/**
 * Sends broken units back to the supplier they were bought from: a purchase
 * return, so what we owe him comes down by their cost. The units were never
 * on the shelf that can be sold, so no stock moves; the lot's own count does.
 * One return per supplier. Throws with a message for the screen.
 */
export async function sendToSupplier(body, createdBy) {
  const picked = await loadPicks(body.items);

  for (const { lot } of picked) {
    if (!lot.supplierId || !lot.purchaseId) {
      throw new Error(`${lot.productName}${lot.imei ? ` ${lot.imei}` : ""}: no purchase of it is on record, so it cannot go to a supplier. Write it off instead.`);
    }
  }

  const bySupplier = new Map();
  for (const entry of picked) {
    const key = String(entry.lot.supplierId);
    bySupplier.set(key, [...(bySupplier.get(key) || []), entry]);
  }

  const refundAmount = Math.max(0, round2(body.refundAmount));
  if (refundAmount > 0 && bySupplier.size > 1) throw new Error("Enter the refund for one supplier at a time");

  const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();
  if (Number.isNaN(returnDate.getTime())) throw new Error("Return date is invalid");

  const type = await PurchaseReturnType.findOne({ deletedAt: null, name: /damag/i }).select("name").lean();

  // check every purchase row before anything is saved
  const asked = new Map(); // "purchaseId:line" → units asked from that row
  for (const { lot, qty } of picked) {
    const key = `${lot.purchaseId}:${lot.purchaseLine}`;
    asked.set(key, (asked.get(key) || 0) + qty);
  }
  for (const [key, units] of asked) {
    const [purchaseId, line] = key.split(":");
    const purchase = await Purchase.findOne({ _id: purchaseId, deletedAt: null, status: "received" }).select("items purchaseNumber").lean();
    const item = purchase?.items?.[Number(line)];
    if (!item) throw new Error("A purchase it came from no longer exists");
    const room = stockQtyOf(item) - (Number(item.returnedQty) || 0);
    if (units > room) throw new Error(`${purchase.purchaseNumber} ${item.productName}: only ${room} can still go back on that purchase`);
  }

  const saved = [];

  for (const entries of bySupplier.values()) {
    const first = entries[0].lot;
    const items = entries.map(({ lot, qty }) => ({
      purchaseId: lot.purchaseId,
      purchaseNumber: lot.purchaseNumber,
      purchaseLine: lot.purchaseLine,
      productId: lot.productId,
      variantId: lot.variantId,
      productName: lot.productName,
      variantLabel: lot.variantLabel,
      barcode: lot.imei || "",
      quantity: qty,
      unitPrice: lot.unitCost,
      total: round2(qty * lot.unitCost),
      returnTypeId: type?._id || null,
      reason: type?.name || "Damaged",
      damagedLotId: lot._id,
    }));
    const total = round2(items.reduce((sum, item) => sum + item.total, 0));
    if (refundAmount - total > 0.009) throw new Error("Refund cannot be more than the return total");

    const refundMethod = METHODS.includes(body.refundMethod) ? body.refundMethod : "cash";

    const ret = await PurchaseReturn.create({
      returnNumber: await nextDocumentNumber("PRT", "purchase_return"),
      supplierId: first.supplierId,
      supplierName: first.supplierName,
      returnDate,
      items,
      total,
      refundAmount,
      refundMethod,
      note: String(body.note || "").trim().slice(0, 5000) || "Damaged goods returned by customers",
      createdBy,
    });

    for (const { lot, qty } of entries) {
      await Purchase.updateOne({ _id: lot.purchaseId }, { $inc: { [`items.${lot.purchaseLine}.returnedQty`]: qty } });
      lot.left -= qty;
      lot.sentQty += qty;
      lot.history.push({ type: "supplier_return", qty, ref: ret.returnNumber, by: createdBy, date: returnDate });
      await lot.save();
    }

    if (refundAmount > 0) {
      const payment = await SupplierPayment.create({
        invoiceNo: await nextDocumentNumber("RCV", "supplier_receive"),
        supplierId: first.supplierId,
        type: "receive",
        amount: refundAmount,
        method: refundMethod,
        note: `Refund for return ${ret.returnNumber}`,
        date: returnDate,
        createdBy,
      });
      ret.refundPaymentId = payment._id;
      await ret.save();
    }

    saved.push(ret);
  }

  return saved;
}

/** Takes broken units off the shelf as a loss (no supplier takes them) */
export async function writeOffLots(body, createdBy) {
  const picked = await loadPicks(body.items);
  const note = String(body.note || "").trim().slice(0, 300);

  for (const { lot, qty } of picked) {
    lot.left -= qty;
    lot.writtenOffQty += qty;
    lot.history.push({ type: "write_off", qty, note, by: createdBy });
    await lot.save();
  }

  return picked.reduce((sum, { lot, qty }) => sum + qty * lot.unitCost, 0);
}

/** A purchase return that took broken units back to a supplier is deleted: they are on the damaged shelf again */
export async function restoreLotsOfReturn(ret) {
  for (const line of ret.items) {
    if (!line.damagedLotId) continue;

    const lot = await DamagedLot.findById(line.damagedLotId);
    if (!lot) continue;

    lot.left += line.quantity;
    lot.sentQty = Math.max(0, lot.sentQty - line.quantity);
    lot.history = lot.history.filter((entry) => !(entry.type === "supplier_return" && entry.ref === ret.returnNumber));
    await lot.save();
  }
}
