import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import User from "@/models/User.model";
import Showroom from "@/models/Showroom.model";
import mongoose from "mongoose";
import RoleModel, { ensureSystemRoles } from "@/models/Role.model";
import { normalizeBdMobile, isValidBdMobile } from "@/lib/bdFormat";
import { standInEmail } from "@/lib/mobileLogin";

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
    if (!body.name?.trim()) throw new Error("Name is required");
    // a login needs a mobile number or an email to sign in with
    if (!body.phone?.trim() && !body.email?.trim()) throw new Error("Enter a mobile number or an email to log in with");
    if (String(body.password || "").length < 4) {
      throw new Error("Password must be at least 4 characters");
    }
    if (body.phone && !isValidBdMobile(body.phone)) {
      throw new Error("Enter a Bangladeshi mobile number (01XXXXXXXXX)");
    }
    // the mobile number is a login, so two logins cannot share one
    if (body.phone && (await User.exists({ phone: normalizeBdMobile(body.phone), deletedAt: null }))) {
      throw new Error("This mobile number already has a login");
    }

    // Warehouse cashier sells from warehouse; shop cashier from the sale center
    let showroomId = null;
    const posTill = body.posTill === "warehouse" ? "warehouse" : "showroom";
    if (body.role === "cashier" && posTill === "showroom") {
      if (mongoose.isValidObjectId(body.showroomId)) {
        showroomId = body.showroomId;
      } else {
        const store = await Showroom.findOne({ isSaleCenter: true }).sort({ createdAt: 1 }).select("_id").lean()
          || await Showroom.findOne().sort({ createdAt: 1 }).select("_id").lean();
        if (!store) throw new Error("Store is not set up yet");
        showroomId = store._id;
      }
    }

    const user = await User.create({
      name: body.name.trim(),
      email: body.email?.trim() ? body.email.trim().toLowerCase() : standInEmail(normalizeBdMobile(body.phone)),
      password: body.password,
      role: body.role,
      roleId: roleDoc?._id || null,
      phone: body.phone ? normalizeBdMobile(body.phone) : "",
      showroomId,
      posTill,
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
