import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductVariantModel from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import WarehouseStock from "@/models/WarehouseStock.model";

export async function POST(request) {
  try {
    await connectDB();
    const payload = await request.json();

    // ১. ডুপ্লিকেট কম্বিনেশন চেক (একই প্রোডাক্টের একই কালার ও সাইজ কি আগে থেকেই আছে?)
    const existingVariant = await ProductVariantModel.findOne({
      product: payload.product,
      color: payload.color,
      size: payload.size,
    });

    if (existingVariant) {
      return response(
        false,
        400,
        "এই কালার এবং সাইজের ভ্যারিয়েন্ট ইতিমধ্যে যোগ করা হয়েছে।",
      );
    }

    // ২. SKU ইউনিক চেক (SKU সবসময় ইউনিক হতে হবে)
    const existingSku = await ProductVariantModel.findOne({ sku: payload.sku });
    if (existingSku) {
      return response(
        false,
        400,
        "এই SKU টি অন্য একটি ভ্যারিয়েন্টে ব্যবহার করা হয়েছে।",
      );
    }

    // ৩. Zod validation
    const schema = zSchema.pick({
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
      barcode: true,
    });

    const validate = schema.safeParse(payload);
    if (!validate.success) {
      return response(false, 400, "ভ্যালিডেশন এরর।", validate.error);
    }

    const variantData = validate.data;

    // ৪. স্টক নেগেтивного নিচে নামলে ০ করে দিন
    const initialStock = variantData.stock < 0 ? 0 : variantData.stock;

    // ৫. Create Variant
    const newProductVariant = new ProductVariantModel({
      ...variantData,
      stock: initialStock,
      sold: 0, // নতুন প্রোডাক্টের ক্ষেত্রে সোল্ড সবসময় ০ হবে
    });

    await newProductVariant.save();

    // =========================================================
    // 🔥 ৫.১ নতুন সংযোজন: WarehouseStock মডেলে মাদার স্টক এন্ট্রি করা
    // =========================================================
    await WarehouseStock.create({
      productId: variantData.product,
      variantId: newProductVariant._id,
      stock: initialStock, // ফ্রন্টএন্ড থেকে আসা ৫০/৬০ বা যা দেওয়া হবে
      reservedStock: 0, // প্রাথমিকভাবে রিজার্ভ স্টক ০ থাকবে
    });

    // ৬. Push variant ID into Product.variants
    await ProductModel.findByIdAndUpdate(variantData.product, {
      $addToSet: { variants: newProductVariant._id }, // ডুপ্লিকেট পুশ রোধ করবে
    });

    return response(
      true,
      201,
      "ভ্যারিয়েন্ট এবং ওয়ারহাউজ স্টক সফলভাবে তৈরি হয়েছে।",
      {
        variantId: newProductVariant._id,
      },
    );
  } catch (error) {
    console.error("Error creating product variant and warehouse stock:", error);
    return catchError(error, "ভ্যারিয়েন্ট অ্যাড করতে সমস্যা হয়েছে।");
  }
}
