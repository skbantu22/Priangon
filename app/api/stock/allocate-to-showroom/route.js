import { connectDB } from "@/lib/databaseconnection";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";

export async function POST(req) {
  try {
    await connectDB();

    const { showroomId, productId, variantId, qty } = await req.json();

    const quantity = Number(qty);

    if (!quantity || quantity <= 0) {
      return Response.json({
        success: false,
        message: "Invalid quantity",
      });
    }

    // 1. CHECK WAREHOUSE STOCK
    const warehouse = await WarehouseStock.findOne({
      productId,
      variantId,
    });

    if (!warehouse || warehouse.stock < quantity) {
      return Response.json({
        success: false,
        message: "Not enough warehouse stock",
      });
    }

    // 2. DECREASE WAREHOUSE
    warehouse.stock -= quantity;
    await warehouse.save();

    // 3. INCREASE SHOWROOM
    const showroom = await ShowroomStock.findOne({
      showroomId,
      productId,
      variantId,
    });

    if (showroom) {
      showroom.stock += quantity;
      await showroom.save();
    } else {
      await ShowroomStock.create({
        showroomId,
        productId,
        variantId,
        stock: quantity,
      });
    }

    return Response.json({
      success: true,
      message: "Stock transferred successfully",
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}
