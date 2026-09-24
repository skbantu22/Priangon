import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import User from "@/models/User.model";
import Showroom from "@/models/Showroom.model";
import mongoose from "mongoose";
import RoleModel, { ensureSystemRoles } from "@/models/Role.model";
import { normalizeBdMobile, isValidBdMobile } from "@/lib/bdFormat";

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

    await ensureSystemRoles();

    // ================= ROLE =================
    // A role is picked by its document now, so a shop's own roles can be
    // assigned too. `role` is kept in step for the proxy and older checks.
    let roleDoc = null;

    if (mongoose.isValidObjectId(body.roleId)) {
      roleDoc = await RoleModel.findOne({ _id: body.roleId, deletedAt: null });

      if (!roleDoc) throw new Error("Role not found");

      body.role = roleDoc.systemKey || "manager";
    }

    // ================= VALIDATION =================
    // dealers / wholesalers are created from /api/partners (they need a customer account)
    if (!roleDoc && !STAFF_ROLES.includes(body.role)) {
      throw new Error("Choose a role");
    }
    if (!body.name?.trim() || !body.email?.trim()) throw new Error("Name and email are required");
    if (String(body.password || "").length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    if (body.phone && !isValidBdMobile(body.phone)) {
      throw new Error("Enter a Bangladeshi mobile number (01XXXXXXXXX)");
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
      roleId: roleDoc?._id || null,
      phone: body.phone ? normalizeBdMobile(body.phone) : "",
      showroomId,
      isActive: true,

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
