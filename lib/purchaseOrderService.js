import mongoose from "mongoose";

import PurchaseOrder from "@/models/PurchaseOrder.model";
import SupplierModel from "@/models/Supplier.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import { ratesFor } from "@/lib/priceTiers";
import { cleanRates } from "@/lib/purchaseService";
import { nextDocumentNumber } from "@/lib/stockService";

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const dateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** PO-000012, or the next one nobody typed by hand */
async function nextOrderNumber() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const number = await nextDocumentNumber("PO", "purchase_order");

    if (!(await PurchaseOrder.exists({ orderNumber: number }))) return number;
  }

  throw new Error("Could not find a free purchase order number");
}

/** Stock on hand in the warehouse and every showroom, per variant */
async function stockOf(variantIds) {
  const [wh, sr] = await Promise.all([
    WarehouseStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean(),
    ShowroomStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean(),
  ]);

  const onHand = new Map();

  for (const row of [...wh, ...sr]) {
    const key = String(row.variantId);
    onHand.set(key, (onHand.get(key) || 0) + (Number(row.stock) || 0));
  }

  return onHand;
}

/**
 * Checks an order form and writes it onto `order` (new or pending).
 *
 * Rows are rebuilt from the database. What the stock and every rate were
 * when the order was written is kept on the row, so the order still reads
 * "was 700, now 750" after the product changes.
 *
 * Throws an Error with a message fit for the screen.
 */
export async function fillOrder(order, body, createdBy) {
  if (!mongoose.isValidObjectId(body.supplierId)) throw new Error("Select a supplier");

  const supplier = await SupplierModel.findOne({ _id: body.supplierId, deletedAt: null })
    .select("name")
    .lean();

  if (!supplier) throw new Error("Supplier not found");

  const orderDate = dateOrNull(body.orderDate) || new Date();
  const deliveryDate = dateOrNull(body.deliveryDate);

  if (!deliveryDate) throw new Error("Delivery date is required");
  if (deliveryDate.toISOString().slice(0, 10) < orderDate.toISOString().slice(0, 10)) {
    throw new Error("Delivery date cannot be before the order date");
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!rawItems.length) throw new Error("Add at least one product");

  if (rawItems.some((raw) => !mongoose.isValidObjectId(raw?.variantId))) {
    throw new Error("An item has an invalid variant");
  }

  const ids = rawItems.map((raw) => raw.variantId);

  const variants = await ProductVariant.find({ _id: { $in: ids }, deletedAt: null })
    .populate("product", "name sellingPrice purchasePrice dealerPrice subDealerPrice wholesalerPrice tierPrices deletedAt")
    .lean();

  const byId = new Map(variants.map((variant) => [String(variant._id), variant]));
  const onHand = await stockOf(ids);

  const items = [];

  for (const raw of rawItems) {
    const variant = byId.get(String(raw.variantId));

    if (!variant || !variant.product || variant.product.deletedAt) {
      throw new Error("An item's product no longer exists");
    }

    const name = variant.product.name || "item";
    const quantity = Number(raw.quantity);
    const extraQty = Number(raw.extraQty) || 0;
    const purchasePrice = Number(raw.purchasePrice);
    const discount = round2(raw.discount);

    if (!Number.isFinite(quantity) || quantity < 1) throw new Error(`Quantity for "${name}" must be at least 1`);
    if (!Number.isFinite(extraQty) || extraQty < 0) throw new Error(`Extra quantity for "${name}" is invalid`);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) throw new Error(`Purchase price for "${name}" is invalid`);

    const gross = round2(quantity * purchasePrice);

    if (discount < 0 || discount > gross) throw new Error(`Discount for "${name}" is more than its subtotal`);

    const was = ratesFor(variant.product, variant);
    // only a rate that differs is a new rate; the rest stay as the product has them
    const want = Object.fromEntries(
      Object.entries(cleanRates(raw)).map(([field, rate]) => [field, rate === was[field] ? 0 : rate]),
    );

    items.push({
      productId: variant.product._id,
      variantId: variant._id,
      productName: name,
      variantLabel: [variant.color, variant.size]
        .filter((x) => x && !/^(default|standard)$/i.test(x))
        .join(" / "),
      barcode: variant.barcode || variant.sku || "",
      stockAtOrder: onHand.get(String(variant._id)) || 0,
      prevPurchasePrice: Number(variant.purchasePrice) || Number(variant.product.purchasePrice) || 0,
      prevSellingPrice: was.sellingPrice,
      prevDealerPrice: was.dealerPrice,
      prevSubDealerPrice: was.subDealerPrice,
      prevWholesalerPrice: was.wholesalerPrice,
      purchasePrice,
      ...want,
      quantity,
      extraQty,
      discount,
      total: round2(gross - discount),
    });
  }

  const typed = String(body.orderNumber || "").trim().slice(0, 40);

  if (typed && typed !== order.orderNumber) {
    if (await PurchaseOrder.exists({ orderNumber: typed, _id: { $ne: order._id } })) {
      throw new Error(`P.O. no ${typed} is already used`);
    }
  }

  order.orderNumber = typed || order.orderNumber || (await nextOrderNumber());
  order.supplierId = supplier._id;
  order.supplierName = supplier.name;
  order.reference = String(body.reference || "").trim().slice(0, 255);
  order.orderDate = orderDate;
  order.deliveryDate = deliveryDate;
  order.items = items;
  order.total = round2(items.reduce((sum, item) => sum + item.total, 0));
  order.note = String(body.note || "").trim().slice(0, 20000);

  if (body.attachment?.url) {
    order.attachment = {
      url: String(body.attachment.url).trim(),
      publicId: String(body.attachment.publicId || "").trim(),
    };
  }

  if (!order.createdBy) order.createdBy = createdBy;

  return order;
}
