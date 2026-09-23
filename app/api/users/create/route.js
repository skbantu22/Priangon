import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import User from "@/models/User.model";
import Showroom from "@/models/Showroom.model";

const STAFF_ROLES = ["admin", "manager", "cashier"];

export async function POST(req) {
  try {
    // creating logins (incl. admins) is an admin-only action
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await req.json();

    // ================= VALIDATION =================
    // dealers / retailers are created from /api/partners (they need a customer account)
    if (!STAFF_ROLES.includes(body.role)) {
      throw new Error("Choose Admin, Manager or Cashier");
    }
    if (!body.name?.trim() || !body.email?.trim()) throw new Error("Name and email are required");
    if (String(body.password || "").length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // single store: a cashier sells from the one store
    let showroomId = null;
    if (body.role === "cashier") {
      const store = await Showroom.findOne().sort({ createdAt: 1 }).select("_id").lean();
      if (!store) throw new Error("Store is not set up yet");
      showroomId = store._id;
    }

    // ================= CREATE USER =================
    const user = await User.create({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password: body.password,
      role: body.role,
      showroomId,

      // ✅ IMPORTANT FIX
      isEmailVerified: true, // admin-created users
    });

    return Response.json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
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
