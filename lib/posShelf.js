import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";
import ProductVariant from "@/models/ProductVariant.model ";

/**
 * What the till can sell of these variants: every branch plus the warehouse.
 * Opening stock is written to the main store, but a purchase with no branch
 * lands in the warehouse. Either place has to count, or the card says
 * "Out of stock" while the units are sitting there.
 */
export async function onHandMap(variantIds) {
  if (!variantIds?.length) return new Map();

  const [showroom, warehouse, variants] = await Promise.all([
    ShowroomStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean(),
    WarehouseStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean(),
    ProductVariant.find({ _id: { $in: variantIds } }).select("stock").lean(),
  ]);

  const map = new Map();
  const hadShowroom = new Set();
  for (const row of showroom) {
    const key = String(row.variantId);
    hadShowroom.add(key);
    map.set(key, (map.get(key) || 0) + (Number(row.stock) || 0));
  }
  for (const row of warehouse) {
    const key = String(row.variantId);
    map.set(key, (map.get(key) || 0) + (Number(row.stock) || 0));
  }

  // Opening stock is saved on the variant first. If that save never created a
  // showroom row, the shelves are 0 and the till used to say out of stock.
  // A sold-out variant still has its showroom row (at 0), so this does not
  // bring sold units back.
  for (const variant of variants) {
    const key = String(variant._id);
    const qty = Number(variant.stock) || 0;
    if (!hadShowroom.has(key) && (map.get(key) || 0) <= 0 && qty > 0) {
      map.set(key, qty);
    }
  }
  return map;
}

export async function onHand({ productId, variantId }) {
  const map = await onHandMap([variantId]);
  return map.get(String(variantId)) || 0;
}

/** Stock at one till: the warehouse, or one showroom shelf. */
export async function stockMapAt({ locationType, locationId, variantIds }) {
  if (!variantIds?.length) return new Map();

  if (locationType === "WAREHOUSE") {
    const rows = await WarehouseStock.find({ variantId: { $in: variantIds } })
      .select("variantId stock")
      .lean();
    return new Map(rows.map((row) => [String(row.variantId), Number(row.stock) || 0]));
  }

  if (!locationId) return new Map();

  const rows = await ShowroomStock.find({
    showroomId: locationId,
    variantId: { $in: variantIds },
  })
    .select("variantId stock")
    .lean();

  return new Map(rows.map((row) => [String(row.variantId), Number(row.stock) || 0]));
}

export async function onHandAt({ locationType, locationId, productId, variantId }) {
  const map = await stockMapAt({ locationType, locationId, variantIds: [variantId] });
  return map.get(String(variantId)) || 0;
}

/**
 * Takes qty from one till only, so a warehouse sale cannot eat shop stock
 * and a shop sale cannot eat warehouse stock.
 */
export async function deductAtLocation({
  session,
  locationType,
  locationId,
  productId,
  variantId,
  qty,
  label,
}) {
  const need = Number(qty);

  if (locationType === "WAREHOUSE") {
    const row = await WarehouseStock.findOne({ productId, variantId }).session(session);
    const have = Number(row?.stock) || 0;

    if (!row || have < need) {
      throw new Error(`${label}: only ${have} left in the warehouse`);
    }

    row.stock = have - need;
    await row.save({ session });
    await ProductVariant.updateOne({ _id: variantId }, { stock: row.stock }, { session });
    return;
  }

  const row = await ShowroomStock.findOne({
    showroomId: locationId,
    productId,
    variantId,
  }).session(session);
  const have = Number(row?.stock) || 0;

  if (!row || have < need) {
    throw new Error(`${label}: only ${have} left at the sale center`);
  }

  row.stock = have - need;
  await row.save({ session });
}

/**
 * Takes qty out of the till's own branch first, then the warehouse, then any
 * other branch. Matches onHandMap, so a card that says "In stock" can be sold.
 */
export async function deductOnHand({ session, showroomId, productId, variantId, qty, label }) {
  const needStart = Number(qty);
  let need = needStart;

  const showroomRows = await ShowroomStock.find({ productId, variantId }).session(session);
  const warehouse = await WarehouseStock.findOne({ productId, variantId }).session(session);

  const primary = showroomRows.find((row) => String(row.showroomId) === String(showroomId));
  const others = showroomRows.filter((row) => row !== primary);
  const pools = [primary, warehouse, ...others].filter(Boolean);

  let available = pools.reduce((sum, row) => sum + (Number(row.stock) || 0), 0);

  // same case as onHandMap: quantity exists only on the variant
  const variantOnly = !showroomRows.length && available <= 0;
  const variant = variantOnly
    ? await ProductVariant.findById(variantId).select("stock").session(session)
    : null;
  if (variantOnly) available = Number(variant?.stock) || 0;

  if (available < needStart) {
    throw new Error(`${label}: only ${Math.max(0, available)} left in stock`);
  }

  if (variantOnly) {
    variant.stock = available - needStart;
    await variant.save({ session });
    return;
  }

  let touchedWarehouse = false;
  for (const row of pools) {
    if (need <= 0) break;
    const have = Number(row.stock) || 0;
    const take = Math.min(need, have);
    if (take <= 0) continue;
    row.stock = have - take;
    await row.save({ session });
    if (row === warehouse) touchedWarehouse = true;
    need -= take;
  }

  // The warehouse path keeps ProductVariant.stock equal to the warehouse row
  if (touchedWarehouse && warehouse) {
    await ProductVariant.updateOne({ _id: variantId }, { stock: Number(warehouse.stock) || 0 }, { session });
  }
}
