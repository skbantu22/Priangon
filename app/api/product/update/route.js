import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductModel from "@/models/Product.model";
import { encode } from "entities";

export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    console.log("PAYLOAD:", payload); // ✅ See incoming data

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
      offers: true,
      freeDelivery: true,
    });

    const validate = schema.safeParse(payload);

    // ✅ Zod error show
    if (!validate.success) {
      console.log("ZOD ERROR:", validate.error.format());

      return response(
        false,
        400,
        "Validation Error",
        validate.error.format()
      );
    }

    const validatedData = validate.data;

    console.log("VALIDATED DATA:", validatedData);

    // ✅ Check _id
    if (!validatedData?._id) {
      console.log("ID MISSING");
      return response(false, 400, "_id missing");
    }

    const getProduct = await ProductModel.findOne({
      deletedAt: null,
      _id: validatedData._id,
    });

    console.log("FOUND PRODUCT:", getProduct);

    if (!getProduct) {
      return response(false, 404, "Product not found");
    }

    getProduct.name = validatedData.name;
    getProduct.slug = validatedData.slug;
    getProduct.category = validatedData.category;
    getProduct.subcategory = validatedData.subcategory;
    getProduct.mrp = validatedData.mrp;
    getProduct.sellingPrice = validatedData.sellingPrice;
    getProduct.discountPercentage = validatedData.discountPercentage;
    getProduct.description =encode(validatedData.description) ;
    getProduct.media = validatedData.media;

    await getProduct.save();

    return response(true, 200, "Product updated successfully.");

  } catch (error) {

    // ✅ Full error log
    console.log("SERVER ERROR:");
    console.log(error);

    // ✅ Axios readable error
    return response(
      false,
      500,
      error.message,
      error
    );
  }
}