import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

export async function PUT(request) {
  try {
    await connectDB();

    const body = await request.json();

    console.log("REQUEST BODY:", body);

    const { ids, status } = body;

    console.log("IDS:", ids);
    console.log("STATUS:", status);

    if (!ids?.length || !status) {
      return response(false, 400, "Ids and status are required.");
    }

    const result = await OrderModel.updateMany(
      {
        _id: { $in: ids },
      },
      {
        $set: { status },
      },
    );

    console.log("UPDATE RESULT:", result);

    return response(true, 200, "Order status updated successfully.", result);
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    return catchError(error);
  }
}
