import { connectDB } from "@/lib/databaseconnection";
import User from "@/models/User.model";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

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
