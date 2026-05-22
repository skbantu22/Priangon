import { connectDB } from "@/lib/databaseconnection";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";

// Optional but recommended
import "@/models/Product.model";
import "@/models/ProductVariant.model";

export async function POST(req) {
  try {
    await connectDB();

    const { showroomId, productId, variantId, qty } = await req.json();

    const quantity = Number(qty);

    // ================= VALIDATION =================
    if (!quantity || quantity <= 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid quantity",
        },
        { status: 400 },
      );
    }

    // ================= CHECK WAREHOUSE STOCK =================
    const warehouse = await WarehouseStock.findOne({
      productId,
      variantId,
    });

    if (!warehouse) {
      return Response.json(
        {
          success: false,
          message: "Warehouse stock not found",
        },
        { status: 404 },
      );
    }

    if (warehouse.stock < quantity) {
      return Response.json(
        {
          success: false,
          message: "Not enough warehouse stock",
        },
        { status: 400 },
      );
    }

    // ================= DECREASE WAREHOUSE STOCK =================
    warehouse.stock -= quantity;
    await warehouse.save();

    // ================= FIND SHOWROOM STOCK =================
    let showroom = await ShowroomStock.findOne({
      showroomId,
      productId,
      variantId,
    });

    let updatedShowroom;

    // ================= UPDATE OR CREATE SHOWROOM STOCK =================
    if (showroom) {
      showroom.stock += quantity;

      updatedShowroom = await showroom.save();
    } else {
      updatedShowroom = await ShowroomStock.create({
        showroomId,
        productId,
        variantId,
        stock: quantity,
      });
    }

    // ================= POPULATE DATA =================
    const populatedData = await ShowroomStock.findById(updatedShowroom._id)
      .populate({
        path: "productId",
        select: "name media",
      })
      .populate({
        path: "variantId",
        select: "color size sku",
      })
      .populate({
        path: "showroomId",
        select: "name",
      });

    // ================= RESPONSE =================
    return Response.json({
      success: true,
      message: "Stock transferred successfully",
      data: populatedData,
    });
  } catch (error) {
    console.log("SHOWROOM TRANSFER ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Server error",
      },
      { status: 500 },
    );
  }
}
