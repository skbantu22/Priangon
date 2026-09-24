import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ShowroomProductVariant from "@/models/ShowroomProductVariant.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function POST(req) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const { showroomId, data } = body;

    if (!showroomId) {
      return response(false, 400, "Showroom ID required");
    }

    // 🔥 delete old data (important for update system)
    await ShowroomProductVariant.deleteMany({ showroomId });

    // 🔥 insert new data
    const formatted = data.map((item) => ({
      showroomId,
      productId: item.productId,
      variants: item.variants,
    }));

    await ShowroomProductVariant.insertMany(formatted);

    return response(true, 200, "Saved successfully");
  } catch (error) {
    return catchError(error);
  }
}
