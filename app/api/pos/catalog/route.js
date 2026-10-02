import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";
import { catalogAll, catalogForTill } from "@/lib/tillCatalog";

// Categories, brands, and subcategories that have stock at this till only.
export async function GET(request) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const showroomId = searchParams.get("showroomId") || "";
    const catalog = searchParams.get("scope") === "all" ? await catalogAll() : await catalogForTill(showroomId);

    return Response.json({ success: true, showroomId, ...catalog });
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, brands: [], categories: [], subcategories: [] },
      { status: 500 },
    );
  }
}
