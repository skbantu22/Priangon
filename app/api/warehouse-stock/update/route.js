import { connectDB } from "@/lib/databaseconnection";
import WarehouseStock from "@/models/WarehouseStock.model";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import ProductVariant from "@/models/ProductVariant.model ";

export async function PATCH(req) {
  try {
    await connectDB();

    let body;

    try {
      body = await req.json();
    } catch (err) {
      return Response.json(
        {
          success: false,
          message: "Invalid JSON body",
        },
        { status: 400 },
      );
    }

    const { id, qty, type, note = "", createdBy = "admin" } = body || {};

    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Stock ID is required",
        },
        { status: 400 },
      );
    }

    if (!type || !["add", "remove", "set"].includes(type)) {
      return Response.json(
        {
          success: false,
          message: "Invalid type (add | remove | set)",
        },
        { status: 400 },
      );
    }

    const quantity = Number(qty);

    if (type !== "set") {
      if (!quantity || quantity <= 0) {
        return Response.json(
          {
            success: false,
            message: "Invalid quantity",
          },
          { status: 400 },
        );
      }
    }

    const stock = await WarehouseStock.findById(id);

    if (!stock) {
      return Response.json(
        {
          success: false,
          message: "Stock not found",
        },
        { status: 404 },
      );
    }

    const previousStock = stock.stock;

    let newStock = previousStock;

    if (type === "add") {
      newStock = previousStock + quantity;
    }

    if (type === "remove") {
      if (previousStock < quantity) {
        return Response.json(
          {
            success: false,
            message: "Insufficient stock",
          },
          { status: 400 },
        );
      }

      newStock = previousStock - quantity;
    }

    if (type === "set") {
      if (quantity < 0) {
        return Response.json(
          {
            success: false,
            message: "Stock cannot be negative",
          },
          { status: 400 },
        );
      }

      newStock = quantity;
    }

    // ==============================
    // UPDATE WAREHOUSE STOCK
    // ==============================
    stock.stock = newStock;
    await stock.save();

    // ==============================
    // SYNC PRODUCT VARIANT STOCK
    // ==============================
    if (stock.variantId) {
      await ProductVariant.findByIdAndUpdate(
        stock.variantId,
        {
          stock: newStock,
        },
        {
          new: true,
        },
      );
    }

    // ==============================
    // SAVE HISTORY
    // ==============================
    try {
      await InventoryTransaction.create({
        showroomId: stock.showroomId || null,
        productId: stock.productId,
        variantId: stock.variantId,

        type: type === "add" ? "IN" : type === "remove" ? "OUT" : "ADJUSTMENT",

        quantity: type === "set" ? newStock : quantity,
        previousStock,
        newStock,
        note,
        createdBy,
      });
    } catch (historyError) {
      console.error("HISTORY SAVE ERROR:", historyError);
    }

    return Response.json({
      success: true,
      message: "Stock updated successfully",
      data: stock,
    });
  } catch (err) {
    console.error("WAREHOUSE STOCK UPDATE ERROR:", err);

    return Response.json(
      {
        success: false,
        message: "Server error",
        error: err.message,
      },
      { status: 500 },
    );
  }
}
