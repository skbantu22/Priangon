import { connectDB } from "@/lib/databaseconnection";
import WarehouseStock from "@/models/WarehouseStock.model";
import "@/models/ProductVariant.model ";
import "@/models/Product.model";
import "@/models/WarehouseStock.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const productId = searchParams.get("productId");
    const variantId = searchParams.get("variantId");

    // ================= FILTER =================
    const filter = {};

    if (productId) filter.productId = productId;
    if (variantId) filter.variantId = variantId;

    // ================= FETCH STOCK =================
    const stock = await WarehouseStock.find(filter)

      .populate({
        path: "productId",
        select: "name media",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })

      .populate({
        path: "variantId",
        select: "color size sku stock media",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .sort({ createdAt: -1 });

    return Response.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    console.log("WAREHOUSE STOCK API ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to load warehouse stock",
      },
      { status: 500 },
    );
  }
}
