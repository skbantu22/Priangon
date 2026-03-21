import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { zSchema } from "@/lib/zodschema";
import ProductVariantModel from "@/models/ProductVariant.model "; // removed extra space
import ProductModel from "@/models/Product.model"; // ✅ import Product to push variants

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
        "এই কালার এবং সাইজের ভ্যারিয়েন্ট ইতিমধ্যে যোগ করা হয়েছে।"
      );
    }

    // ২. SKU ইউনিক চেক (SKU সবসময় ইউনিক হতে হবে)
    const existingSku = await ProductVariantModel.findOne({ sku: payload.sku });
    if (existingSku) {
      return response(false, 400, "এই SKU টি অন্য একটি ভ্যারিয়েন্টে ব্যবহার করা হয়েছে।");
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
    });

    const validate = schema.safeParse(payload);
    if (!validate.success) {
      return response(false, 400, "ভ্যালিডেশন এরর।", validate.error);
    }

    const variantData = validate.data;

    // ৪. স্টক নেগেটিভ হলে ০ করে দিন
    const initialStock = variantData.stock < 0 ? 0 : variantData.stock;

    // ৫. Create Variant
    const newProductVariant = new ProductVariantModel({
      ...variantData,
      stock: initialStock,
      sold: 0, // নতুন প্রোডাক্টের ক্ষেত্রে সোল্ড সবসময় ০ হবে
    });

    await newProductVariant.save();

    // ৬. Push variant ID into Product.variants
    await ProductModel.findByIdAndUpdate(variantData.product, {
      $addToSet: { variants: newProductVariant._id }, // prevents duplicates
    });

    return response(true, 201, "ভ্যারিয়েন্ট সফলভাবে তৈরি হয়েছে।", {
      variantId: newProductVariant._id,
    });
  } catch (error) {
    return catchError(error, "ভ্যারিয়েন্ট অ্যাড করতে সমস্যা হয়েছে।");
  }
}