import { connectDB } from "@/lib/databaseconnection";
import User from "@/models/User.model";

export async function POST(req) {
  try {
    await connectDB();

    const { userId, showroomId } = await req.json();

    const user = await User.findByIdAndUpdate(
      userId,
      {
        role: "cashier",
        showroomId,
      },
      { new: true },
    );

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
