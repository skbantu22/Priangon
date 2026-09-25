import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

const NUMBER_FIELDS = ["mrp", "sellingPrice", "purchasePrice", "discountPercentage"];
const TEXT_FIELDS = ["sku", "barcode", "color", "size"];

// Update variants. Only the fields sent are changed, so a form that edits
// prices never wipes a variant's photos. Stock is not set here: it moves
// through purchases, transfers and adjustments.
export async function PUT(request) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { variants } = await request.json();

    if (!Array.isArray(variants) || variants.length === 0) {
      return response(false, 400, "Variants are required");
    }

    const updatedVariants = [];

    for (const variant of variants) {
      const variantId = variant._id || variant.id;
      if (!variantId) continue;

      const current = await ProductVariantModel.findById(variantId).select("product color size");
      if (!current) continue;

      const update = {};
      for (const f of TEXT_FIELDS) if (variant[f] !== undefined) update[f] = String(variant[f] || "").trim();
      for (const f of NUMBER_FIELDS) if (variant[f] !== undefined) update[f] = Math.max(0, Number(variant[f]) || 0);
      if (variant.media !== undefined) update.media = variant.media || [];
      if (variant.isActive !== undefined) update.isActive = Boolean(variant.isActive);
      if (update.barcode === "") delete update.barcode;

      if (update.sku) {
        const taken = await ProductVariantModel.exists({ sku: update.sku, _id: { $ne: variantId } });
        if (taken) return response(false, 400, `SKU already exists (${update.sku})`);
      }

      if (update.barcode) {
        const taken = await ProductVariantModel.exists({ barcode: update.barcode, _id: { $ne: variantId } });
        if (taken) return response(false, 400, `Barcode already used (${update.barcode})`);
      }

      const color = update.color ?? current.color;
      const size = update.size ?? current.size;
      const twin = await ProductVariantModel.exists({ product: current.product, color, size, _id: { $ne: variantId } });
      if (twin) return response(false, 400, `${color} + ${size} already exists`);

      const updated = await ProductVariantModel.findByIdAndUpdate(variantId, { $set: update }, { new: true, runValidators: true });
      if (updated) updatedVariants.push(updated);
    }

    return response(true, 200, "Variants updated successfully", updatedVariants);
  } catch (error) {
    console.error(error);
    return catchError(error, "Update failed");
  }
}
