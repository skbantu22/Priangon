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
    const OrderStatus = await OrderModel.aggregate([
      {
        $match: {
          deletedAt: null,
        
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        }
      },
      {
        $sort: { count: 1 }
      }
       
    ]);

    return response(true, 200, 'Data found', OrderStatus);

  } catch (error) {
    return catchError(error);
  }
}