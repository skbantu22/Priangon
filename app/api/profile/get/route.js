
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";

export async function GET() {
  try {
    await connectDB()
    const auth = await isAuthenticated('user')
    if (!auth.isAuth) {
      return response(false, 401, 'Unauthorized')
    }

    const userId = auth.userId

    const user = await UserModel.findById(userId).lean()

    return response(true, 200, 'User data.', user)
  } catch (error) {
    return catchError(error)
  }
}