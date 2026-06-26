import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function PUT(request) {
  try {
    await connectDB();

    const { variants } = await request.json();

    if (!Array.isArray(variants) || variants.length === 0) {
      return response(false, 400, "Variants are required");
    }

    const updatedVariants = [];

    for (const variant of variants) {
      const {
        _id,
        id,
        product,
        sku,
        color,
        size,
        mrp,
        sellingPrice,
        stock,
        media,
        isActive,
        barcode,
        purchasePrice,
        discountPercent,
        discountAmount,
        afterDiscount,
        openingStock,
      } = variant;

      const variantId = _id || id;

      if (!variantId) continue;

      // Duplicate SKU check
      if (sku) {
        const existingSku = await ProductVariantModel.findOne({
          sku,
          _id: { $ne: variantId },
        });

        if (existingSku) {
          return response(false, 400, `SKU already exists (${sku})`);
        }
      }

      // Duplicate Color + Size check
      const existingVariant = await ProductVariantModel.findOne({
        product,
        color,
        size,
        _id: { $ne: variantId },
      });

      if (existingVariant) {
        return response(false, 400, `${color} + ${size} already exists`);
      }

      const updated = await ProductVariantModel.findByIdAndUpdate(
        variantId,
        {
          product,
          sku,
          barcode,
          color,
          size,
          mrp: Number(mrp || purchasePrice) || 0,
          purchasePrice: Number(purchasePrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          discountPercent: Number(discountPercent) || 0,
          discountAmount: Number(discountAmount) || 0,
          afterDiscount: Number(afterDiscount) || 0,
          stock: Number(stock || openingStock) || 0,
          openingStock: Number(openingStock) || 0,
          media: media || [],
          isActive: !!isActive,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (updated) {
        updatedVariants.push(updated);
      }
    }

    return response(
      true,
      200,
      "Variants updated successfully",
      updatedVariants,
    );
  } catch (error) {
    console.error(error);
    return catchError(error, "Update failed");
  }
}
