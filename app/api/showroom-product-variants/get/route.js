import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ShowroomModel from "@/models/ShowroomProductVariant.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId");

    const data = await ShowroomModel.find({ showroomId }).lean();

    return response(true, 200, "ok", data);
  } catch (error) {
    return catchError(error);
  }
}
