import { z } from "zod";
import slugify from "slugify";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response, zodMessage } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";
import { cleanMobileFields } from "@/lib/productMobileFields";
import { cleanTierPrices } from "@/lib/priceTiers";
import { cleanExtraFields } from "@/lib/productExtraFields";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function POST(request) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const payload = await request.json();

    // the slug is made from the name; nobody types one in
    if (String(payload.slug || "").trim().length < 3) {
      const base = slugify(String(payload.name || ""), { lower: true, strict: true }) || "product";
      payload.slug = `${base}-${Date.now().toString(36).slice(-4)}`;
    }

    // ✅ Validation schema
    const schema = zSchema.pick({
      name: true,
      slug: true,
      category: true,
      subcategory: true,
      mrp: true,
      sellingPrice: true,
      discountPercentage: true,
      description: true,
      media: true,
      offers: true,
      freeDelivery: true,
    }).extend({
      description: z.string().optional().default(""),
      media: z.array(z.string()).optional().default([]),
    });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, zodMessage(validate.error), validate.error);
    }

    let productData = validate.data;

    // ✅ Clean subcategory
    productData.subcategory =
      productData.subcategory && productData.subcategory !== ""
        ? productData.subcategory
        : null;

    // ✅ CLEAN + NORMALIZE NAME
    const normalizedName = productData.name.trim();

    // ❌ CHECK DUPLICATE PRODUCT NAME (case-insensitive)
    const existingProduct = await ProductModel.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
    });

    if (existingProduct) {
      return response(
        false,
        409,
        "Product name already exists. Please use a different name.",
      );
    }

    // ✅ Create product
    const newProduct = new ProductModel({
      name: productData.name,
      slug: productData.slug,
      category: productData.category,
      subcategory: productData.subcategory,

      mrp: productData.mrp,
      sellingPrice: productData.sellingPrice,
      discountPercentage: productData.discountPercentage,

      description: encode(productData.description),
      media: productData.media,

      ...cleanMobileFields(payload),
      ...cleanTierPrices(payload),
      ...cleanExtraFields(payload),
      // no photo: POS only until one is added
      ...(!productData.media.length && { showInWebsite: false }),

      freeDelivery: productData.freeDelivery || false,
    });

    await newProduct.save();

    // ✅ Success response
    return response(true, 200, "Product added successfully.", newProduct);
  } catch (error) {
    console.log("PRODUCT CREATE ERROR:");
    console.log(error);
    return catchError(error);
  }
}
