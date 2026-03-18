import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import UserModel from "@/models/User.model";


export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth?.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const filter = { deletedAt: null };

    const coupons = await UserModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!coupons?.length) {
      return response(false, 404, "Collection empty.", []);
    }

    return response(true, 200, "Data found.", coupons);
  } catch (error) {
    console.log(error)
    return catchError(error);
  }
}