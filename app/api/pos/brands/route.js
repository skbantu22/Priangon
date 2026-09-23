import { connectDB } from "@/lib/databaseconnection";
import Product from "@/models/Product.model";

// Brands that have at least one live product, for the POS brand filter
export async function GET() {
  try {
    await connectDB();

    const brands = await Product.distinct("brand", {
      deletedAt: null,
      brand: { $nin: [null, ""] },
    });

    brands.sort((a, b) => a.localeCompare(b));

    return Response.json({ success: true, brands });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, brands: [] }, { status: 500 });
  }
}
