import WarehouseStock from "@/models/WarehouseStock.model";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import ProductVariant from "@/models/ProductVariant.model ";

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
    const quantity = Number(item.quantity) || 0;

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
        unitPrice: Number(item.unitPrice) || 0,
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
    const quantity = Number(item.quantity) || 0;

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
    const quantity = Number(item.quantity) || 0;

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
