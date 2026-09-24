import { connectDB } from "@/lib/databaseconnection";
import WarehouseStock from "@/models/WarehouseStock.model";
import "@/models/ProductVariant.model ";
import "@/models/Product.model";
import "@/models/category.model";
import "@/models/Media.model";

import "@/models/WarehouseStock.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

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
        select: "name media category",
        populate: [
          {
            path: "media",
            select: "secure_url",
          },
          {
            path: "category",
            select: "name",
          },
        ],
      })

      .populate({
        path: "variantId",
        select: "color size sku barcode  stock media",
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
