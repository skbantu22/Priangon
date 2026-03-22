import ProductModel from "@/models/Product.model";
import { connectDB } from "@/lib/databaseconnection";
import MediaModel from "@/models/Media.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import SubCategoryModel from "@/models/subcategory.model";
import CategoryModel from "@/models/category.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category");
    const exclude = searchParams.get("exclude");

    if (!category) {
      return new Response(
        JSON.stringify({ products: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const products = await ProductModel.find({
      category,
      _id: { $ne: exclude },
      deletedAt: null,
    })
      .limit(100)
      .sort({ createdAt: -1 })
      .populate("media", "_id secure_url") // ✅ populate media with secure_url
      .populate("subcategory", "name")     // optional, if you want subcategory info
      .lean();

    return new Response(
      JSON.stringify({ products }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Recommended Products API Error:", error);
    return new Response(
      JSON.stringify({ products: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}