import ShowroomInventory from "@/models/ShowroomInventory";
import InventoryTransaction from "@/models/InventoryTransaction.model";

export async function increaseStock({
  showroomId,
  productId,
  variantId,
  quantity,
  type = "IN",
  note = "",
}) {
  const inventory = await ShowroomInventory.findOneAndUpdate(
    {
      showroomId,
      variantId,
    },
    {
      $inc: {
        stock: quantity,
      },

      $setOnInsert: {
        showroomId,
        productId,
        variantId,
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  const previousStock = inventory.stock - quantity;

  await InventoryTransaction.create({
    showroomId,
    productId,
    variantId,
    quantity,
    previousStock,
    newStock: inventory.stock,
    type,
    note,
  });

  return inventory;
}

export async function decreaseStock({
  showroomId,
  productId,
  variantId,
  quantity,
  type = "OUT",
  note = "",
}) {
  const existing = await ShowroomInventory.findOne({
    showroomId,
    variantId,
  });

  if (!existing || existing.stock < quantity) {
    throw new Error("Insufficient stock");
  }

  const inventory = await ShowroomInventory.findOneAndUpdate(
    {
      showroomId,
      variantId,
      stock: { $gte: quantity },
    },
    {
      $inc: {
        stock: -quantity,
      },
    },
    {
      new: true,
    },
  );

  await InventoryTransaction.create({
    showroomId,
    productId,
    variantId,
    quantity,
    previousStock: existing.stock,
    newStock: inventory.stock,
    type,
    note,
  });

  return inventory;
}

export async function adjustStock({
  showroomId,
  productId,
  variantId,
  newQuantity,
  note = "",
}) {
  const existing = await ShowroomInventory.findOne({
    showroomId,
    variantId,
  });

  const previousStock = existing?.stock || 0;

  const inventory = await ShowroomInventory.findOneAndUpdate(
    {
      showroomId,
      variantId,
    },
    {
      stock: newQuantity,

      $setOnInsert: {
        showroomId,
        productId,
        variantId,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  await InventoryTransaction.create({
    showroomId,
    productId,
    variantId,
    quantity: Math.abs(previousStock - newQuantity),
    previousStock,
    newStock: newQuantity,
    type: "ADJUSTMENT",
    note,
  });

  return inventory;
}
