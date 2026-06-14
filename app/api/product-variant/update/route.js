import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    const {
      _id,
      product,
      sku,
      color,
      size,
      mrp,
      sellingPrice,
      stock,
      media,
      isActive,
    } = payload;

    if (!_id) {
      return response(false, 400, "_id is required");
    }

    // 🔥 1. Duplicate SKU check (important)
    const existingSku = await ProductVariantModel.findOne({
      sku,
      _id: { $ne: _id },
    });

    if (existingSku) {
      return response(false, 400, "SKU already exists");
    }

    // 🔥 2. Duplicate color-size check
    const existingVariant = await ProductVariantModel.findOne({
      product,
      color,
      size,
      _id: { $ne: _id },
    });

    if (existingVariant) {
      return response(false, 400, "This color & size already exists");
    }

    // 🔥 3. Direct update (BEST PRACTICE)
    const updated = await ProductVariantModel.findByIdAndUpdate(
      _id,
      {
        product,
        sku,
        color,
        size,
        mrp: Number(mrp) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stock: Math.max(0, Number(stock) || 0),
        media: media || [],
        isActive: !!isActive,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updated) {
      return response(false, 404, "Variant not found");
    }

    return response(true, 200, "Variant updated successfully", updated);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return catchError(error, "Update failed");
  }
}
