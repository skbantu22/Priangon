import { connectDB } from "@/lib/databaseconnection";
import User from "@/models/User.model";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    // ================= VALIDATION =================
    if (body.role === "cashier" && !body.showroomId) {
      throw new Error("Cashier requires showroom");
    }

    // ================= CREATE USER =================
    const user = await User.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,

      showroomId: body.role === "cashier" ? body.showroomId : null,

      // ✅ IMPORTANT FIX
      isEmailVerified: true, // admin-created users
    });

    return Response.json({
      success: true,
      user,
    });
  } catch (err) {
    console.log(err);
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 400 },
    );
  }
}
