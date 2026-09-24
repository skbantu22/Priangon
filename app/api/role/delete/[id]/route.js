import { NextResponse } from "next/server";

import RoleModel from "@/models/Role.model";
import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("users.roles");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const role = await RoleModel.findOne({ _id: id, deletedAt: null });

    if (!role) {
      return NextResponse.json(
        { success: false, message: "Role not found" },
        { status: 404 },
      );
    }

    if (role.isSystem) {
      return NextResponse.json(
        {
          success: false,
          message: `${role.name} ships with the app and cannot be deleted. Turn it off instead.`,
        },
        { status: 409 },
      );
    }

    // A login whose role vanished could do nothing at all, so the role
    // has to be emptied of people first
    const inUse = await UserModel.countDocuments({
      roleId: id,
      deletedAt: null,
    });

    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${inUse} user(s) still have this role. Move them to another role first.`,
        },
        { status: 409 },
      );
    }

    role.deletedAt = new Date();
    await role.save();

    return NextResponse.json({
      success: true,
      message: "Role moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
