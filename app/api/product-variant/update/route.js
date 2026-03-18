import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import CategoryModel from "@/models/category.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";


export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    console.log("PAYLOAD:", payload); // ✅ See incoming data

    const schema = zSchema.pick({
    
       _id: true,
        product: true,
        sku: true,
        color: true,
        size: true,
        mrp: true,
        sellingPrice: true,
        stock: true,
        description: true,
        media: true,
        isActive: true, 
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

    const getProduct = await ProductVariantModel.findOne({
      deletedAt: null,
      _id: validatedData._id,
    });

    console.log("FOUND PRODUCT:", getProduct);

    if (!getProduct) {
      return response(false, 404, "Product not found");
    }

   getProduct._id = validatedData._id;                  // Variant ID
getProduct.product = validatedData.product;         // Parent product reference
getProduct.mrp = Number(validatedData.mrp) || 0;
getProduct.sellingPrice = Number(validatedData.sellingPrice) || 0;
getProduct.discountPercentage = Number(validatedData.discountPercentage) || 0;
getProduct.description = validatedData.description || "";
getProduct.media = validatedData.media || [];
getProduct.sku = validatedData.sku || "";
getProduct.color = validatedData.color || "";
getProduct.size = validatedData.size || "";
getProduct.stock = Number(validatedData.stock) || 0;
getProduct.isActive = !!validatedData.isActive;
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