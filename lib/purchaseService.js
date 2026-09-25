import WarehouseStock from "@/models/WarehouseStock.model";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import ProductVariant from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import PurchaseModel from "@/models/Purchase.model";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";

export const RATE_FIELDS = ["sellingPrice", "dealerPrice", "subDealerPrice", "wholesalerPrice"];
const TIER_FIELDS = ["dealerPrice", "subDealerPrice", "wholesalerPrice"];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** A rate set as sent by a form: every field a price ≥ 0, 0 = not set */
export const cleanRates = (rates = {}) =>
  Object.fromEntries(RATE_FIELDS.map((field) => [field, Math.max(0, round2(rates?.[field]))]));

/**
 * PUR-15, or the next free one. A number typed by hand can take a counter
 * value before the counter reaches it, so a taken number is skipped.
 */
export async function nextPurchaseNumber() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const number = `PUR-${await getNextInvoiceNumber("purchase")}`;

    if (!(await PurchaseModel.exists({ purchaseNumber: number }))) return number;
  }

  throw new Error("Could not find a free purchase number");
}

/**
 * Puts the sale rates a purchase order asked for onto the product.
 *
 * The buyer price is the variant's own. Dealer, sub dealer and wholesaler
 * rates live on the product, set against its base selling price, and
 * every variant gets them scaled to its own price (tierRateForVariant). So
 * a rate asked for on a dearer variant is scaled back to the base before
 * it is stored, and this variant then comes out at exactly that rate.
 *
 * Runs when goods are taken into stock: a price rise should not reach the
 * counter before the goods do.
 */
export async function applyNewRates(items) {
  for (const item of items) {
    const rates = cleanRates(item.newRates);

    if (!RATE_FIELDS.some((field) => rates[field] > 0)) continue;

    const [variant, product] = await Promise.all([
      ProductVariant.findById(item.variantId).select("sellingPrice mrp").lean(),
      ProductModel.findById(item.productId).select("sellingPrice mrp").lean(),
    ]);

    if (!variant || !product) continue;

    let price = Number(variant.sellingPrice) || Number(product.sellingPrice) || 0;
    let base = Number(product.sellingPrice) || 0;

    if (rates.sellingPrice > 0) {
      price = rates.sellingPrice;

      await ProductVariant.updateOne(
        { _id: variant._id },
        {
          $set: {
            sellingPrice: price,
            priceSource: "CUSTOM",
            ...(Number(variant.mrp) < price && { mrp: price }),
          },
        },
      );

      // A product with one variant has one price: keep the product's in step,
      // so the website and the tier rates read the same base
      const siblings = await ProductVariant.countDocuments({ product: product._id, deletedAt: null });

      if (siblings <= 1) {
        base = price;

        await ProductModel.updateOne(
          { _id: product._id },
          { $set: { sellingPrice: price, ...(Number(product.mrp) < price && { mrp: price }) } },
        );
      }
    }

    const tiers = {};

    for (const field of TIER_FIELDS) {
      if (!rates[field]) continue;
      tiers[field] = base && price && base !== price ? Math.round((rates[field] * base) / price) : rates[field];
    }

    if (Object.keys(tiers).length) {
      await ProductModel.updateOne({ _id: product._id }, { $set: tiers });
    }
  }
}

/** Cost held on a variant right now, 0 when it has never been bought */
async function currentVariantCost(variantId) {
  const variant = await ProductVariant.findById(variantId).select(
    "purchasePrice",
  );

  return Number(variant?.purchasePrice) || 0;
}

/**
 * Moving average cost.
 *
 * 10 units held at 20,000 plus 5 bought at 23,000 gives 21,000, so an old
 * stock bought cheaply is not suddenly valued at today's price. With no
 * stock left, or no cost recorded yet, the new price simply takes over.
 */
export function movingAverageCost({ previousStock, previousCost, quantity, unitPrice }) {
  if (previousStock <= 0 || previousCost <= 0) return unitPrice;

  const total = previousStock * previousCost + quantity * unitPrice;
  const units = previousStock + quantity;

  return Math.round((total / units) * 100) / 100;
}

/** Units a purchase row puts into stock: the paid quantity plus free ones */
export const stockQtyOf = (item) => (Number(item.quantity) || 0) + (Number(item.extraQty) || 0);

/**
 * What one unit of a row really cost: the line total (after its discount)
 * spread over every unit received, free ones included. Old rows without
 * extra units or a discount come out at their unit price.
 */
export function unitCostOf(item) {
  const units = stockQtyOf(item);
  if (!units) return Number(item.unitPrice) || 0;
  const total = Number(item.total);
  const lineTotal = Number.isFinite(total) ? total : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  return Math.round((lineTotal / units) * 100) / 100;
}

/**
 * Moves a received purchase into mother (warehouse) stock.
 *
 * Mirrors what /api/warehouse-stock/update does for a manual edit: the
 * warehouse row is the source of truth, ProductVariant.stock is kept in
 * sync so the POS and website read the same number, and every change
 * leaves an InventoryTransaction behind.
 */
export async function applyPurchaseToStock(purchase, { createdBy = "" } = {}) {
  for (const item of purchase.items) {
    const quantity = stockQtyOf(item);

    if (quantity <= 0) continue;

    const existing = await WarehouseStock.findOne({
      productId: item.productId,
      variantId: item.variantId,
    });

    const previousStock = existing?.stock || 0;
    const newStock = previousStock + quantity;

    if (existing) {
      existing.stock = newStock;
      await existing.save();
    } else {
      await WarehouseStock.create({
        productId: item.productId,
        variantId: item.variantId,
        stock: newStock,
      });
    }

    await ProductVariant.findByIdAndUpdate(item.variantId, {
      stock: newStock,
      purchasePrice: movingAverageCost({
        previousStock,
        previousCost: await currentVariantCost(item.variantId),
        quantity,
        unitPrice: unitCostOf(item),
      }),
    });

    // History must never block the stock update itself
    try {
      await InventoryTransaction.create({
        showroomId: null,
        productId: item.productId,
        variantId: item.variantId,
        type: "IN",
        quantity,
        previousStock,
        newStock,
        note: `Purchase ${purchase.purchaseNumber}`,
        createdBy,
      });
    } catch (historyError) {
      console.error("PURCHASE HISTORY SAVE ERROR:", historyError);
    }
  }
}

/**
 * Reverses a received purchase, used when it is cancelled or deleted.
 * Refuses if the goods have already been sold or transferred out, because
 * pulling the stock down would leave the warehouse row negative.
 */
export async function reversePurchaseStock(purchase, { createdBy = "" } = {}) {
  // The same variant can appear on more than one row, and each row is
  // taken out of the same warehouse figure. Checking them one at a time
  // would pass twice over the same units and leave the row negative, so
  // the rows are added up per variant before anything is compared.
  const neededByVariant = new Map();

  for (const item of purchase.items) {
    const quantity = stockQtyOf(item);

    if (quantity <= 0) continue;

    const key = String(item.variantId);
    const row = neededByVariant.get(key);

    if (row) {
      row.quantity += quantity;
    } else {
      neededByVariant.set(key, {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        quantity,
      });
    }
  }

  for (const need of neededByVariant.values()) {
    const existing = await WarehouseStock.findOne({
      productId: need.productId,
      variantId: need.variantId,
    });

    const previousStock = existing?.stock || 0;

    if (previousStock < need.quantity) {
      throw new Error(
        `"${need.productName}" has only ${previousStock} in stock, so ${need.quantity} cannot be reversed. Those units were already sold or transferred.`,
      );
    }
  }

  for (const item of purchase.items) {
    const quantity = stockQtyOf(item);

    if (quantity <= 0) continue;

    const existing = await WarehouseStock.findOne({
      productId: item.productId,
      variantId: item.variantId,
    });

    const previousStock = existing.stock;
    const newStock = previousStock - quantity;

    existing.stock = newStock;
    await existing.save();

    // Stock comes back out, but the cost stays: an average cannot be
    // un-mixed, and guessing here would quietly distort profit reports
    await ProductVariant.findByIdAndUpdate(item.variantId, {
      stock: newStock,
    });

    try {
      await InventoryTransaction.create({
        showroomId: null,
        productId: item.productId,
        variantId: item.variantId,
        type: "OUT",
        quantity,
        previousStock,
        newStock,
        note: `Purchase ${purchase.purchaseNumber} reversed`,
        createdBy,
      });
    } catch (historyError) {
      console.error("PURCHASE REVERSE HISTORY ERROR:", historyError);
    }
  }
}
