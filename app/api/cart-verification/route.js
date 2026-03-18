import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model "; // ✅ make sure path is correct
import MediaModel from "@/models/Media.model"; // ✅ make sure path is correct
import ProductModel from "@/models/Product.model";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();
    const items = Array.isArray(payload) ? payload : payload?.products || [];

    if (!Array.isArray(items) || items.length === 0) {
      return response(false, 400, "Cart payload is empty.", []);
    }

    const verifiedCartData = (await Promise.all(
      items.map(async (cartItem) => {

            console.log("Variant ID:", cartItem?.variantId); // ✅ inside the loop

        const variant = await ProductVariantModel.findById(cartItem?.variantId)
          .populate("product", "name slug")
          .populate("media", "secure_url")
          .lean();

        if (!variant || !variant.product) return null;

        const qty = Number(cartItem?.quantity ?? cartItem?.qty ?? 1);

        return {
          productId: variant.product._id,
          variantId: variant._id,
          name: variant.product.name,
          slug: variant.product.slug,
          size: variant.size,
          color: variant.color,
          mrp: Number(variant.mrp || 0),
          sellingPrice: Number(variant.sellingPrice || 0),
          media: variant?.media?.[0]?.secure_url || null,
          discount: Number(variant.discountPercentage || 0),
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        };
      })
    )).filter(Boolean);

    return response(true, 200, "Verified Cart Data.", verifiedCartData);
  } catch (error) {
        console.error("Cart verification error:", error); // 🔥 important

    return catchError(error, "Failed to verify cart.");
  }
}
