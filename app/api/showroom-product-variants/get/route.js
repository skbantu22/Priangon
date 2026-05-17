import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ShowroomModel from "@/models/ShowroomProductVariant.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId");

    const data = await ShowroomModel.find({ showroomId }).lean();

    return response(true, 200, "ok", data);
  } catch (error) {
    return catchError(error);
  }
}
