import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();

    // ✅ Add subcategory + offers + freeDelivery (optional but nice)
    const schema = zSchema.pick({
      name: true,
      slug: true,
      category: true,
      subcategory: true, // ✅ FIX
      mrp: true,
      sellingPrice: true,
      discountPercentage: true,
      description: true,
      media: true,
      offers: true, // ✅ optional (if your zSchema has it)
      freeDelivery: true, // ✅ optional (if your zSchema has it)
      sizeChart: true, // ✅ ADD THIS
    });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error);
    }

    const productData = validate.data;

    const newProduct = new ProductModel({
      name: productData.name,
      slug: productData.slug,
      category: productData.category,
      subcategory: productData.subcategory, // ✅ FIX
      mrp: productData.mrp,
      sellingPrice: productData.sellingPrice,
      discountPercentage: productData.discountPercentage,
      description: encode(productData.description),
      media: productData.media,
      sizeChart:
        productData.sizeChart && productData.sizeChart !== ""
          ? productData.sizeChart
          : null,
      freeDelivery: productData.freeDelivery || false, // ✅ safe
    });

    await newProduct.save();

    return response(true, 200, "Product added successfully.");
  } catch (error) {
    return catchError(error);
  }
}
