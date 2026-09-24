import { NextResponse } from "next/server";

import RoleModel, { ensureSystemRoles } from "@/models/Role.model";
import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { PERMISSION_COUNT, PERMISSION_GROUPS } from "@/lib/permissions";

export async function GET() {
  try {
    const auth = await requirePermission("users.roles");
    if (auth.response) return auth.response;

    await connectDB();
    await ensureSystemRoles();

    const roles = await RoleModel.find({ deletedAt: null }).sort({
      isSystem: -1,
      name: 1,
    });

    // How many logins each role holds, so a role in use is obvious
    const counts = await UserModel.aggregate([
      { $match: { deletedAt: null, roleId: { $ne: null } } },
      { $group: { _id: "$roleId", count: { $sum: 1 } } },
    ]);

    const userCount = new Map(counts.map((row) => [String(row._id), row.count]));

    return NextResponse.json({
      success: true,
      data: roles.map((role) => ({
        _id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        systemKey: role.systemKey,
        isSystem: role.isSystem,
        isActive: role.isActive,
        userCount: userCount.get(String(role._id)) || 0,
      })),
      groups: PERMISSION_GROUPS,
      permissionCount: PERMISSION_COUNT,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
