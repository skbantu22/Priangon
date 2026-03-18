import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

export async function GET(req) {
  try {
    // Check admin authentication
    const auth = await isAuthenticated('admin');
    if (!auth.isAuth) {
      return response(false, 403, 'Unauthorized.');
    }

    // Connect to DB
    await connectDB();

    // Aggregate monthly sales
    const monthlySales = await OrderModel.aggregate([
      {
        $match: {
          deletedAt: null,
          status: { $in: ['processing', 'shipped', 'delivered'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalSales: { $sum: '$total' } // Make sure your Order schema has `total` field
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    return response(true, 200, 'Data found', monthlySales);

  } catch (error) {
    return catchError(error);
  }
}