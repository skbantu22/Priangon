import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";
import WarehouseStock from "@/models/WarehouseStock.model";

export async function PUT(request) {
  try {
    await connectDB();

    const body = await request.json();

    const { ids, status } = body;

    if (!ids?.length || !status) {
      return response(false, 400, "Ids and status are required.");
    }

    // 🔥 STEP 1: Get orders BEFORE update (important for old status + items)
    const orders = await OrderModel.find({
      _id: { $in: ids },
    });

    // 🔥 STEP 2: Update status
    const result = await OrderModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status } },
    );

    // 🔥 STEP 3: CANCEL LOGIC (SAFE + PRODUCTION READY)
    if (status === "cancelled") {
      for (const order of orders) {
        // ❗ prevent double cancel processing
        if (order.status === "cancelled") continue;

        for (const item of order.items || []) {
          if (!item.productId || !item.variantId) continue;

          await WarehouseStock.findOneAndUpdate(
            {
              productId: item.productId,
              variantId: item.variantId,
            },
            {
              $inc: {
                stock: item.quantity,
                reservedStock: -item.quantity,
              },
            },
          );
        }
      }
    }

    return response(true, 200, "Order status updated successfully.", result);
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    return catchError(error);
  }
}
