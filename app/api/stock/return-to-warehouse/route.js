import { connectDB } from "@/lib/databaseconnection";

import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function POST(req) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  await connectDB();

  const { showroomId, productId, variantId, qty } = await req.json();

  const quantity = Number(qty);

  if (!quantity || quantity <= 0) {
    return Response.json(
      { success: false, message: "Invalid quantity" },
      { status: 400 },
    );
  }

  const showroomStock = await ShowroomStock.findOne({
    showroomId,
    productId,
    variantId,
  });

  if (!showroomStock || showroomStock.stock < quantity) {
    return Response.json(
      { success: false, message: "Not enough showroom stock" },
      { status: 400 },
    );
  }

  showroomStock.stock -= quantity;
  await showroomStock.save();

  const warehouseStock = await WarehouseStock.findOne({
    productId,
    variantId,
  });

  if (warehouseStock) {
    warehouseStock.stock += quantity;
    await warehouseStock.save();
  }

  return Response.json({
    success: true,
    message: "Stock returned to warehouse",
  });
}
