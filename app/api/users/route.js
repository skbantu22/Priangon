import { NextResponse } from "next/server";

import UserModel from "@/models/User.model";
import RoleModel, { ensureSystemRoles } from "@/models/Role.model";
import Showroom from "@/models/Showroom.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { PARTNER_ROLES } from "@/lib/priceTiers";

// GET /api/users: the staff login list behind the Users page
export async function GET(req) {
  try {
    const auth = await requirePermission("users.view");
    if (auth.response) return auth.response;

    await connectDB();
    await ensureSystemRoles();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    // Dealer and wholesaler logins have their own page
    if (searchParams.get("include") !== "partners") {
      filter.role = { $nin: [...PARTNER_ROLES, "customer"] };
    }

    const status = searchParams.get("status");
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "inactive") filter.isActive = false;

    const search = searchParams.get("search")?.trim();

    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const users = await UserModel.find(filter)
      .select("name email phone role roleId showroomId isActive createdAt")
      .populate({ path: "roleId", model: RoleModel, select: "name systemKey" })
      .populate({ path: "showroomId", model: Showroom, select: "name" })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      success: true,
      data: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        // A user made before roles existed still shows the key they hold
        roleName: user.roleId?.name || user.role,
        roleId: user.roleId?._id || null,
        role: user.role,
        showroom: user.showroomId?.name || "",
        showroomId: user.showroomId?._id || null,
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
