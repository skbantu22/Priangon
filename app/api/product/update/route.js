import { connectDB } from "@/lib/databaseconnection";
import { response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";

export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    const schema = zSchema.pick({
      _id: true,
      name: true,
      slug: true,
      category: true,
      subcategory: true,
      mrp: true,
      sellingPrice: true,
      discountPercentage: true,
      description: true,
      media: true,
    });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Validation Error", validate.error.format());
    }

    const data = validate.data;

    if (!data?._id) {
      return response(false, 400, "_id missing");
    }

    const product = await ProductModel.findOne({
      deletedAt: null,
      _id: data._id,
    });

    if (!product) {
      return response(false, 404, "Product not found");
    }

    // ✅ SAFE ObjectId handling (IMPORTANT FIX)
    const subcategory =
      data.subcategory && data.subcategory !== "" ? data.subcategory : null;

    const category =
      data.category && data.category !== "" ? data.category : null;

    // ✅ Assign safely
    product.name = data.name;
    product.slug = data.slug;
    product.category = category;
    product.subcategory = subcategory;
    product.mrp = data.mrp;
    product.sellingPrice = data.sellingPrice;
    product.discountPercentage = data.discountPercentage;
    product.description = encode(data.description);
    product.media = data.media;

    await product.save();

    return response(true, 200, "Product updated successfully.");
  } catch (error) {
    console.log(error);
    return response(false, 500, error.message);
  }
}
