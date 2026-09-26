import mongoose from "mongoose";

import PurchaseModel from "@/models/Purchase.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import PurchaseReturnType from "@/models/PurchaseReturnType.model";
import SupplierModel from "@/models/Supplier.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import { applyStockChange, nextDocumentNumber } from "@/lib/stockService";
import { escapeRegex } from "@/lib/escapeRegex";
import { purchaseLocation, stockQtyOf, unitCostOf } from "@/lib/purchaseService";

/**
 * Goods going back to a supplier.
 *
 * A return can only take what a received purchase brought in and has not
 * already been returned — and only while the units are still where the
 * purchase put them (a branch or the warehouse), since sold goods cannot
 * be sent back. The return total comes
 * off what the shop owes the supplier (supplierBalances counts it); cash
 * the supplier hands back at once is a "receive" supplier payment.
 */

const METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** "<branch id or warehouse>:<variant id>" — a stock row where a purchase put its goods */
const stockKey = (showroomId, variantId) => `${showroomId ? String(showroomId) : "warehouse"}:${variantId}`;

/**
 * Stock on hand for [{ showroomId, variantId }] pairs, keyed by stockKey.
 * Goods go back to the supplier from where the purchase put them, so each
 * row is counted at its own location only.
 */
async function stockAt(pairs) {
  const warehouseIds = pairs.filter((p) => !p.showroomId).map((p) => p.variantId);
  const branchPairs = pairs.filter((p) => p.showroomId);

  const [wh, sr] = await Promise.all([
    warehouseIds.length ? WarehouseStock.find({ variantId: { $in: warehouseIds } }).select("variantId stock").lean() : [],
    branchPairs.length
      ? ShowroomStock.find({ $or: branchPairs.map((p) => ({ showroomId: p.showroomId, variantId: p.variantId })) })
          .select("showroomId variantId stock")
          .lean()
      : [],
  ]);

  const stock = new Map();
  const add = (key, qty) => stock.set(key, (stock.get(key) || 0) + (Number(qty) || 0));

  for (const row of wh) add(stockKey(null, row.variantId), row.stock);
  for (const row of sr) add(stockKey(row.showroomId, row.variantId), row.stock);

  return stock;
}

/**
 * Purchase rows that can still go back, newest purchase first. Each row
 * says what was bought (free units included), what already went back and
 * what can go back now.
 */
export async function returnableLines({ supplierId, search, page = 1, limit = 50 } = {}) {
  const match = { deletedAt: null, status: "received" };

  if (mongoose.isValidObjectId(supplierId)) match.supplierId = new mongoose.Types.ObjectId(supplierId);

  const pipeline = [
    { $match: match },
    { $unwind: { path: "$items", includeArrayIndex: "line" } },
    {
      $addFields: {
        bought: { $add: ["$items.quantity", { $ifNull: ["$items.extraQty", 0] }] },
        returned: { $ifNull: ["$items.returnedQty", 0] },
      },
    },
    { $addFields: { left: { $subtract: ["$bought", "$returned"] } } },
    { $match: { left: { $gt: 0 } } },
  ];

  const text = String(search || "").trim();

  if (text) {
    const regex = { $regex: escapeRegex(text), $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { purchaseNumber: regex },
          { referenceNo: regex },
          { "items.productName": regex },
          { "items.sku": regex },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { purchaseDate: -1, createdAt: -1, line: 1 } },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              purchaseId: "$_id",
              purchaseNumber: 1,
              purchaseDate: 1,
              supplierId: 1,
              supplierName: 1,
              showroomId: 1,
              locationName: 1,
              line: 1,
              item: "$items",
              bought: 1,
              returned: 1,
              left: 1,
            },
          },
        ],
        count: [{ $count: "n" }],
      },
    },
  );

  const [result] = await PurchaseModel.aggregate(pipeline);
  const rows = result?.rows || [];
  const total = result?.count?.[0]?.n || 0;

  const variantIds = [...new Set(rows.map((row) => String(row.item.variantId)))];
  const [stock, variants] = await Promise.all([
    stockAt(rows.map((row) => ({ showroomId: row.showroomId, variantId: row.item.variantId }))),
    ProductVariant.find({ _id: { $in: variantIds } }).select("barcode").lean(),
  ]);
  const barcodeOf = new Map(variants.map((variant) => [String(variant._id), variant.barcode || ""]));

  return {
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    from: total ? (page - 1) * limit + 1 : 0,
    hasMore: page * limit < total,
    data: rows.map((row) => {
      const inStock = stock.get(stockKey(row.showroomId, row.item.variantId)) || 0;

      return {
        key: `${row.purchaseId}:${row.line}`,
        purchaseId: row.purchaseId,
        purchaseNumber: row.purchaseNumber,
        purchaseDate: row.purchaseDate,
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        location: row.locationName || "Warehouse",
        line: row.line,
        variantId: row.item.variantId,
        productName: row.item.productName,
        variantLabel: row.item.variantLabel,
        sku: row.item.sku,
        barcode: barcodeOf.get(String(row.item.variantId)) || "",
        bought: row.bought,
        returned: row.returned,
        inStock,
        returnable: Math.max(0, Math.min(row.left, inStock)),
        unitPrice: unitCostOf(row.item),
      };
    }),
  };
}

/** Checks a return form, moves the stock and saves it. Throws with a message for the screen. */
export async function createPurchaseReturn(body, createdBy) {
  if (!mongoose.isValidObjectId(body.supplierId)) throw new Error("Select a supplier");

  const supplier = await SupplierModel.findOne({ _id: body.supplierId, deletedAt: null })
    .select("name")
    .lean();

  if (!supplier) throw new Error("Supplier not found");

  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!rawItems.length) throw new Error("Select at least one product to return");

  const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();

  if (Number.isNaN(returnDate.getTime())) throw new Error("Return date is invalid");

  const purchases = new Map();
  const typeIds = rawItems.map((raw) => raw.returnTypeId).filter((id) => mongoose.isValidObjectId(id));
  const types = new Map(
    (await PurchaseReturnType.find({ _id: { $in: typeIds }, deletedAt: null }).select("name").lean()).map(
      (type) => [String(type._id), type.name],
    ),
  );

  const lines = [];
  const seen = new Set();

  for (const raw of rawItems) {
    if (!mongoose.isValidObjectId(raw?.purchaseId)) throw new Error("A purchase is invalid");

    const line = Number(raw.line);
    const key = `${raw.purchaseId}:${line}`;

    if (seen.has(key)) throw new Error("The same purchase row is listed twice");
    seen.add(key);

    let purchase = purchases.get(String(raw.purchaseId));

    if (!purchase) {
      purchase = await PurchaseModel.findOne({
        _id: raw.purchaseId,
        supplierId: supplier._id,
        deletedAt: null,
        status: "received",
      }).lean();

      if (!purchase) throw new Error("A purchase was not bought from this supplier, or is not received");

      purchases.set(String(raw.purchaseId), purchase);
    }

    const item = Number.isInteger(line) ? purchase.items[line] : null;

    if (!item) throw new Error(`${purchase.purchaseNumber}: that product row no longer exists`);

    const quantity = Number(raw.quantity);
    const left = stockQtyOf(item) - (Number(item.returnedQty) || 0);
    const unitPrice = round2(raw.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`${item.productName}: return quantity must be more than 0`);
    }

    if (quantity > left) {
      throw new Error(`${item.productName} (${purchase.purchaseNumber}): only ${left} can be returned`);
    }

    if (unitPrice < 0) throw new Error(`${item.productName}: unit price is invalid`);

    const typeId = mongoose.isValidObjectId(raw.returnTypeId) ? String(raw.returnTypeId) : "";

    lines.push({
      purchaseId: purchase._id,
      purchaseNumber: purchase.purchaseNumber,
      purchaseLine: line,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      barcode: item.sku || "",
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
      returnTypeId: types.has(typeId) ? typeId : null,
      reason: types.get(typeId) || String(raw.reason || "").trim().slice(0, 150),
    });
  }

  // Units that were sold cannot go back: check every variant, at the place
  // its purchase put it, before anything moves — adding rows of the same
  // variant and place up
  const needed = new Map();

  for (const line of lines) {
    const purchase = purchases.get(String(line.purchaseId));
    const key = stockKey(purchase.showroomId, line.variantId);
    const row = needed.get(key);
    if (row) row.qty += line.quantity;
    else needed.set(key, { name: line.productName, where: purchase.locationName || "the warehouse", showroomId: purchase.showroomId, variantId: line.variantId, qty: line.quantity });
  }

  const stock = await stockAt([...needed.values()]);

  for (const [key, need] of needed) {
    const have = stock.get(key) || 0;

    if (need.qty > have) {
      throw new Error(`${need.name}: only ${have} left at ${need.where}, so ${need.qty} cannot go back`);
    }
  }

  const total = round2(lines.reduce((sum, line) => sum + line.total, 0));
  const refundAmount = Math.max(0, round2(body.refundAmount));

  if (refundAmount - total > 0.009) throw new Error("Refund cannot be more than the return total");

  const refundMethod = METHODS.includes(body.refundMethod) ? body.refundMethod : "cash";

  const ret = await PurchaseReturn.create({
    returnNumber: await nextDocumentNumber("PRT", "purchase_return"),
    supplierId: supplier._id,
    supplierName: supplier.name,
    returnDate,
    items: lines,
    total,
    refundAmount,
    refundMethod,
    note: String(body.note || "").trim().slice(0, 5000),
    createdBy,
  });

  for (const line of lines) {
    await PurchaseModel.updateOne(
      { _id: line.purchaseId },
      { $inc: { [`items.${line.purchaseLine}.returnedQty`]: line.quantity } },
    );

    await applyStockChange({
      ...purchaseLocation(purchases.get(String(line.purchaseId))),
      productId: line.productId,
      variantId: line.variantId,
      delta: -line.quantity,
      type: "OUT",
      note: `Purchase return ${ret.returnNumber}`,
      createdBy,
      productName: line.productName,
    });
  }

  if (refundAmount > 0) {
    const payment = await SupplierPayment.create({
      invoiceNo: await nextDocumentNumber("RCV", "supplier_receive"),
      supplierId: supplier._id,
      type: "receive",
      amount: refundAmount,
      method: refundMethod,
      reference: String(body.refundReference || "").trim(),
      note: `Refund for return ${ret.returnNumber}`,
      date: returnDate,
      createdBy,
    });

    ret.refundPaymentId = payment._id;
    await ret.save();
  }

  return ret;
}

/**
 * Takes a return back: the goods go back where their purchase put them, the purchase
 * rows can be returned again, and the refund taken with it is removed.
 */
export async function deletePurchaseReturn(ret, createdBy) {
  for (const line of ret.items) {
    const purchase = await PurchaseModel.findById(line.purchaseId).select("items showroomId").lean();
    const item = purchase?.items?.[line.purchaseLine];

    if (item && String(item.variantId) === String(line.variantId)) {
      await PurchaseModel.updateOne(
        { _id: line.purchaseId },
        {
          $set: {
            [`items.${line.purchaseLine}.returnedQty`]: Math.max(
              0,
              (Number(item.returnedQty) || 0) - line.quantity,
            ),
          },
        },
      );
    }

    await applyStockChange({
      ...purchaseLocation(purchase || {}),
      productId: line.productId,
      variantId: line.variantId,
      delta: line.quantity,
      type: "IN",
      note: `Purchase return ${ret.returnNumber} deleted`,
      createdBy,
      productName: line.productName,
    });
  }

  if (ret.refundPaymentId) {
    await SupplierPayment.updateOne(
      { _id: ret.refundPaymentId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
  }

  ret.deletedAt = new Date();
  await ret.save();
}
