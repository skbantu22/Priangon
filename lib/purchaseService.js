import WarehouseStock from "@/models/WarehouseStock.model";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import ProductVariant from "@/models/ProductVariant.model ";

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
  for (const item of purchase.items) {
    const quantity = Number(item.quantity) || 0;

    if (quantity <= 0) continue;

    const existing = await WarehouseStock.findOne({
      productId: item.productId,
      variantId: item.variantId,
    });

    const previousStock = existing?.stock || 0;

    if (previousStock < quantity) {
      throw new Error(
        `"${item.productName}" has only ${previousStock} in stock, so ${quantity} cannot be reversed. Those units were already sold or transferred.`,
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
