import { connectDB } from "@/lib/databaseconnection";
import Product from "@/models/Product.model";
import BrandModel from "@/models/Brand.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";
import { ensurePosDemoBrands, POS_DEMO_BRAND_NAMES } from "@/lib/posDemoBrands";

// Brands for the POS filter: live product brands + catalog brands (incl. demo names).
export async function GET() {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const addedDemo = await ensurePosDemoBrands(BrandModel);

    const [fromProducts, catalog] = await Promise.all([
      Product.distinct("brand", {
        deletedAt: null,
        brand: { $nin: [null, ""] },
      }),
      BrandModel.find({ deletedAt: null, isActive: { $ne: false } })
        .select("name")
        .lean(),
    ]);

    const merged = [
      ...new Set([
        ...fromProducts.map((b) => String(b).trim()).filter(Boolean),
        ...catalog.map((b) => String(b.name || "").trim()).filter(Boolean),
      ]),
    ];

    merged.sort((a, b) => a.localeCompare(b));

    const brands =
      merged.length > 0 ? merged : [...POS_DEMO_BRAND_NAMES].sort((a, b) => a.localeCompare(b));

    return Response.json({ success: true, brands, addedDemo });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, brands: [] }, { status: 500 });
  }
}
