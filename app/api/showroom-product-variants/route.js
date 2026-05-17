import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ShowroomProductVariant from "@/models/ShowroomProductVariant.model";
// (YOU NEED THIS MODEL)

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId");

    if (!showroomId) {
      return response(false, 400, "showroomId required");
    }

    const data = await ShowroomProductVariant.find({
      showroomId,
    }).lean();

    return response(true, 200, "Assigned data", data);
  } catch (error) {
    return catchError(error);
  }
}
