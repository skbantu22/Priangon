import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();

    // ✅ Zod validation schema
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
      sizeChart: true,
    });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error);
    }

    let productData = validate.data;

    // ✅ CLEAN subcategory (IMPORTANT FIX)
    productData.subcategory =
      productData.subcategory && productData.subcategory !== ""
        ? productData.subcategory
        : null;

    // ✅ Create product
    const newProduct = new ProductModel({
      name: productData.name,
      slug: productData.slug,
      category: productData.category,

      // ✅ SAFE OPTIONAL FIELD
      subcategory: productData.subcategory,

      mrp: productData.mrp,
      sellingPrice: productData.sellingPrice,
      discountPercentage: productData.discountPercentage,

      description: encode(productData.description),
      media: productData.media,

      sizeChart:
        productData.sizeChart && productData.sizeChart !== ""
          ? productData.sizeChart
          : null,

      freeDelivery: productData.freeDelivery || false,
    });

    await newProduct.save();

    return response(true, 200, "Product added successfully.");
  } catch (error) {
    console.log("PRODUCT CREATE ERROR:");
    console.log(error);
    return catchError(error);
  }
}
