
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

export async function GET() {
  try {
    const auth = await isAuthenticated('admin')

    if (!auth || !auth.isAuth) {
      return response(false, 403, 'Unauthorized.')
    }

    await connectDB()

    const latestOrder = await OrderModel
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return response(true, 200, 'Data found', latestOrder)

  } catch (error) {
    return catchError(error)
  }
}