import { connectDB } from "@/lib/databaseconnection";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import StockTransfer from "@/models/StockTransfer.model";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    console.log("🔥 FULL BODY:", body);

    const { showroomId, productId, variantId, quantity } = body;

    console.log("🔥 IDS FROM FRONTEND:");
    console.log("showroomId:", showroomId);
    console.log("productId:", productId);
    console.log("variantId:", variantId);
    console.log("quantity:", quantity);

    // ===============================
    // FIND ALL WAREHOUSE STOCK
    // ===============================
    const allWarehouse = await WarehouseStock.find().lean();

    console.log("🔥 ALL WAREHOUSE DATA:");
    console.log(JSON.stringify(allWarehouse, null, 2));

    // ===============================
    // FIND MATCH
    // ===============================
    const warehouse = await WarehouseStock.findOne({
      productId,
      variantId,
    });

    console.log("🔥 MATCHED WAREHOUSE:");
    console.log(warehouse);

    // ===============================
    // IF NULL
    // ===============================
    if (!warehouse) {
      console.log("❌ NO MATCH FOUND");

      return Response.json({
        success: false,
        message: "Warehouse stock not found",
      });
    }

    console.log("✅ BEFORE REDUCE:", warehouse.stock);

    // ===============================
    // REDUCE STOCK
    // ===============================
    warehouse.stock -= Number(quantity);

    await warehouse.save();

    console.log("✅ AFTER REDUCE:", warehouse.stock);

    // ===============================
    // SHOWROOM STOCK
    // ===============================
    const showroom = await ShowroomStock.findOneAndUpdate(
      {
        showroomId,
        productId,
        variantId,
      },
      {
        $inc: {
          stock: Number(quantity),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    console.log("✅ SHOWROOM UPDATED:");
    console.log(showroom);

    // ===============================
    // HISTORY
    // ===============================
    const history = await StockTransfer.create({
      fromType: "WAREHOUSE",
      fromId: warehouse._id,

      toType: "SHOWROOM",
      toId: showroomId,

      productId,
      variantId,

      quantity,
    });

    console.log("✅ HISTORY SAVED:");
    console.log(history);

    return Response.json({
      success: true,
      message: "Transfer success",
    });
  } catch (err) {
    console.log("❌ TRANSFER ERROR:");
    console.log(err);

    return Response.json({
      success: false,
      message: "Server error",
    });
  }
}
