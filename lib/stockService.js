import mongoose from "mongoose";

import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import ProductVariant from "@/models/ProductVariant.model ";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import Showroom from "@/models/Showroom.model";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";

/**
 * One way in and out of a stock figure.
 *
 * Stock lives in two collections — one warehouse row per variant, one
 * showroom row per variant per showroom — and every screen that moves it
 * has to update the right one, keep ProductVariant.stock in step for the
 * POS and the website, and leave a movement behind. Doing that in each
 * route is how the numbers drift apart, so it is done here once.
 */

export const WAREHOUSE = "WAREHOUSE";
export const SHOWROOM = "SHOWROOM";

/** What the browser sends for the mother stock, which has no id */
export const WAREHOUSE_KEY = "warehouse";

/**
 * Turns the single value a dropdown carries into a location.
 * "warehouse" is the mother stock; anything else must be a showroom id.
 */
export function parseLocation(value) {
  if (!value || value === WAREHOUSE_KEY) {
    return { locationType: WAREHOUSE, locationId: null };
  }

  if (!mongoose.isValidObjectId(value)) return null;

  return { locationType: SHOWROOM, locationId: String(value) };
}

/** The value a dropdown carries for a location */
export const locationKey = ({ locationType, locationId }) =>
  locationType === WAREHOUSE ? WAREHOUSE_KEY : String(locationId);

/** Warehouse plus every showroom, for the location dropdowns */
export async function listLocations() {
  const showrooms = await Showroom.find({ isActive: { $ne: false } })
    .select("name")
    .sort({ name: 1 })
    .lean();

  return [
    { key: WAREHOUSE_KEY, type: WAREHOUSE, id: null, name: "Warehouse" },
    ...showrooms.map((showroom) => ({
      key: String(showroom._id),
      type: SHOWROOM,
      id: String(showroom._id),
      name: showroom.name,
    })),
  ];
}

export async function locationName({ locationType, locationId }) {
  if (locationType === WAREHOUSE) return "Warehouse";

  const showroom = await Showroom.findById(locationId).select("name").lean();

  return showroom?.name || "Showroom";
}

/** Fails early rather than letting a transfer land nowhere */
export async function assertLocationExists({ locationType, locationId }) {
  if (locationType === WAREHOUSE) return true;

  const showroom = await Showroom.findById(locationId).select("_id").lean();

  return !!showroom;
}

/** What is on hand right now, 0 when the row does not exist yet */
export async function readStock({
  locationType,
  locationId,
  productId,
  variantId,
}) {
  if (locationType === WAREHOUSE) {
    const row = await WarehouseStock.findOne({ productId, variantId })
      .select("stock")
      .lean();

    return Number(row?.stock) || 0;
  }

  const row = await ShowroomStock.findOne({
    showroomId: locationId,
    productId,
    variantId,
  })
    .select("stock")
    .lean();

  return Number(row?.stock) || 0;
}

/**
 * Moves a stock figure by delta and records why.
 *
 * Refuses to take out more than is there, so no screen can leave a row
 * negative. Returns the figures before and after, which the adjustment
 * and transfer rows keep for their own paper trail.
 */
export async function applyStockChange({
  locationType,
  locationId,
  productId,
  variantId,
  delta,
  type,
  note = "",
  createdBy = "",
  productName = "item",
}) {
  const change = Number(delta);

  if (!Number.isFinite(change) || change === 0) {
    throw new Error("Nothing to move");
  }

  let previousStock = 0;
  let newStock = 0;

  if (locationType === WAREHOUSE) {
    const existing = await WarehouseStock.findOne({ productId, variantId });

    previousStock = Number(existing?.stock) || 0;
    newStock = previousStock + change;

    if (newStock < 0) {
      throw new Error(
        `"${productName}" has only ${previousStock} in the warehouse`,
      );
    }

    if (existing) {
      existing.stock = newStock;
      await existing.save();
    } else {
      await WarehouseStock.create({ productId, variantId, stock: newStock });
    }

    // The POS and the website read the variant, not the warehouse row
    await ProductVariant.findByIdAndUpdate(variantId, { stock: newStock });
  } else {
    const existing = await ShowroomStock.findOne({
      showroomId: locationId,
      productId,
      variantId,
    });

    previousStock = Number(existing?.stock) || 0;
    newStock = previousStock + change;

    if (newStock < 0) {
      throw new Error(`"${productName}" has only ${previousStock} there`);
    }

    if (existing) {
      existing.stock = newStock;
      await existing.save();
    } else {
      await ShowroomStock.create({
        showroomId: locationId,
        productId,
        variantId,
        stock: newStock,
      });
    }
  }

  // History must never block the stock update itself
  try {
    await InventoryTransaction.create({
      showroomId: locationType === SHOWROOM ? locationId : null,
      productId,
      variantId,
      type,
      quantity: Math.abs(change),
      previousStock,
      newStock,
      note,
      createdBy,
    });
  } catch (historyError) {
    console.error("STOCK HISTORY SAVE ERROR:", historyError);
  }

  return { previousStock, newStock };
}

/** ADJ-000012, TRF-000012 — readable on a printed challan */
export async function nextDocumentNumber(prefix, counter) {
  const seq = await getNextInvoiceNumber(counter);

  return `${prefix}-${String(seq).padStart(6, "0")}`;
}

/**
 * Rebuilds the rows a form sent from the database, so a quantity or a
 * name changed in the browser cannot decide what happens to stock.
 */
export async function buildStockItems(rawItems) {
  const items = [];

  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    if (!mongoose.isValidObjectId(raw?.variantId)) {
      throw new Error("An item has an invalid variant");
    }

    const variant = await ProductVariant.findOne({
      _id: raw.variantId,
      deletedAt: null,
    }).populate("product", "name");

    if (!variant) {
      throw new Error("An item's variant no longer exists");
    }

    const quantity = Number(raw.quantity);

    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error(
        `Quantity for "${variant.product?.name || "item"}" must be at least 1`,
      );
    }

    items.push({
      productId: variant.product?._id || variant.product,
      variantId: variant._id,
      productName: variant.product?.name || "",
      variantLabel: [variant.color, variant.size].filter(Boolean).join(" / "),
      sku: variant.sku || "",
      quantity: Math.floor(quantity),
    });
  }

  if (items.length === 0) {
    throw new Error("Add at least one item");
  }

  return items;
}

/**
 * Which locations a login may act on.
 *
 * A cashier tied to a showroom sees that showroom only — their received
 * list should not show another branch's goods. Admins and managers, and
 * anyone not tied to a showroom, see everything.
 */
export function allowedLocation(auth, { locationType, locationId }) {
  if (!auth?.showroomId || auth.role === "admin" || auth.role === "manager") {
    return true;
  }

  return locationType === SHOWROOM && String(locationId) === String(auth.showroomId);
}
