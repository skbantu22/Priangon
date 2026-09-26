import { NextResponse } from "next/server";

import UserModel from "@/models/User.model";
import RoleModel, { ensureSystemRoles } from "@/models/Role.model";
import Showroom from "@/models/Showroom.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { CUSTOMER_TYPES, PARTNER_ROLES } from "@/lib/priceTiers";

// GET /api/users: every login behind the Users page, staff and partners
export async function GET(req) {
  try {
    const auth = await requirePermission("users.view");
    if (auth.response) return auth.response;

    await connectDB();
    await ensureSystemRoles();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    // ?type=staff | dealer | subDealer | wholesaler
    const type = searchParams.get("type");
    if (type === "staff") filter.role = { $nin: [...PARTNER_ROLES, "customer"] };
    else if (PARTNER_ROLES.includes(type)) filter.role = type;
    else filter.role = { $ne: "customer" };

    const status = searchParams.get("status");
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "inactive") filter.isActive = false;

    const search = searchParams.get("search")?.trim();

    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const users = await UserModel.find(filter)
      .select("name email phone role roleId showroomId isActive canOrder createdAt")
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
        roleName: CUSTOMER_TYPES[user.role]?.short || user.roleId?.name || user.role,
        isPartner: PARTNER_ROLES.includes(user.role),
        canOrder: user.canOrder !== false,
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
