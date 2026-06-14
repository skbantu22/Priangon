import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function PUT(request, context) {
  try {
    await connectDB();

    // ✅ Next 15 safe params
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return response(false, 400, "Variant ID is required");
    }

    const payload = await request.json();

    const variant = await ProductVariantModel.findById(id);

    if (!variant) {
      return response(false, 404, "Variant not found");
    }

    // =========================
    // PRICE SOURCE FIX (MAIN)
    // =========================

    const priceSource = payload.priceSource || variant.priceSource || "PRODUCT";

    variant.priceSource = priceSource;

    console.log("PAYLOAD:", payload);
    console.log("BEFORE:", {
      priceSource: variant.priceSource,
      mrp: variant.mrp,
      sellingPrice: variant.sellingPrice,
    });

    if (priceSource === "CUSTOM") {
      // 👉 Admin manually controls price
      variant.mrp = Number(payload.mrp ?? variant.mrp);
      variant.sellingPrice = Number(
        payload.sellingPrice ?? variant.sellingPrice,
      );
    }

    console.log("AFTER:", {
      mrp: variant.mrp,
      sellingPrice: variant.sellingPrice,
    });

    if (priceSource === "PRODUCT") {
      // 👉 ALWAYS sync from product if needed
      if (payload.productPrices) {
        variant.mrp = Number(payload.productPrices.mrp || 0);
        variant.sellingPrice = Number(payload.productPrices.sellingPrice || 0);
      }
    }

    // =========================
    // NORMAL FIELDS
    // =========================
    variant.sku = payload.sku ?? variant.sku;
    variant.color = payload.color ?? variant.color;
    variant.size = payload.size ?? variant.size;
    variant.stock = Math.max(0, Number(payload.stock ?? variant.stock));
    variant.media = payload.media ?? variant.media;
    variant.isActive =
      typeof payload.isActive === "boolean"
        ? payload.isActive
        : variant.isActive;

    await variant.save();

    return response(true, 200, "Variant updated successfully", variant);
  } catch (error) {
    return catchError(error, "Variant update failed");
  }
}
