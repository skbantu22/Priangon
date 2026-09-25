import mongoose from "mongoose";

import PurchaseModel from "@/models/Purchase.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import PurchaseReturnType from "@/models/PurchaseReturnType.model";
import SupplierModel from "@/models/Supplier.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import { WAREHOUSE, applyStockChange, nextDocumentNumber } from "@/lib/stockService";
import { escapeRegex } from "@/lib/escapeRegex";
import { stockQtyOf, unitCostOf } from "@/lib/purchaseService";

/**
 * Goods going back to a supplier.
 *
 * A return can only take what a received purchase brought in and has not
 * already been returned — and only while the units are still in the
 * warehouse, since sold goods cannot be sent back. The return total comes
 * off what the shop owes the supplier (supplierBalances counts it); cash
 * the supplier hands back at once is a "receive" supplier payment.
 */

const METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Warehouse stock per variant id */
async function warehouseStock(variantIds) {
  const rows = await WarehouseStock.find({ variantId: { $in: variantIds } })
    .select("variantId stock")
    .lean();

  const stock = new Map();

  for (const row of rows) {
    const key = String(row.variantId);
    stock.set(key, (stock.get(key) || 0) + (Number(row.stock) || 0));
  }

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
    warehouseStock(variantIds),
    ProductVariant.find({ _id: { $in: variantIds } }).select("barcode").lean(),
  ]);
  const barcodeOf = new Map(variants.map((variant) => [String(variant._id), variant.barcode || ""]));

  return {
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    from: total ? (page - 1) * limit + 1 : 0,
    hasMore: page * limit < total,
    data: rows.map((row) => {
      const inStock = stock.get(String(row.item.variantId)) || 0;

      return {
        key: `${row.purchaseId}:${row.line}`,
        purchaseId: row.purchaseId,
        purchaseNumber: row.purchaseNumber,
        purchaseDate: row.purchaseDate,
        supplierId: row.supplierId,
        supplierName: row.supplierName,
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

  // Units that were sold cannot go back: check every variant against the
  // warehouse before anything moves, adding rows of the same variant up
  const needed = new Map();

  for (const line of lines) {
    const key = String(line.variantId);
    needed.set(key, { name: line.productName, qty: (needed.get(key)?.qty || 0) + line.quantity });
  }

  const stock = await warehouseStock([...needed.keys()]);

  for (const [variantId, need] of needed) {
    const have = stock.get(variantId) || 0;

    if (need.qty > have) {
      throw new Error(`${need.name}: only ${have} left in the warehouse, so ${need.qty} cannot go back`);
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
      locationType: WAREHOUSE,
      locationId: null,
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
 * Takes a return back: the goods go into the warehouse again, the purchase
 * rows can be returned again, and the refund taken with it is removed.
 */
export async function deletePurchaseReturn(ret, createdBy) {
  for (const line of ret.items) {
    const purchase = await PurchaseModel.findById(line.purchaseId).select("items").lean();
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
      locationType: WAREHOUSE,
      locationId: null,
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
