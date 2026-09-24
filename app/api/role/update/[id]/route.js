import { NextResponse } from "next/server";

import RoleModel from "@/models/Role.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { cleanPermissions } from "@/lib/permissions";
import { escapeRegex } from "@/lib/escapeRegex";

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission("users.roles");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Role name is required" },
        { status: 400 },
      );
    }

    const role = await RoleModel.findOne({ _id: id, deletedAt: null });

    if (!role) {
      return NextResponse.json(
        { success: false, message: "Role not found" },
        { status: 404 },
      );
    }

    // Admin is the way back in when a role is misconfigured, so it keeps
    // every permission and stays enabled
    if (role.systemKey === "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin always holds every permission, so it cannot be narrowed.",
        },
        { status: 409 },
      );
    }

    const duplicate = await RoleModel.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
      deletedAt: null,
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "Another role already uses this name" },
        { status: 409 },
      );
    }

    const permissions = cleanPermissions(body.permissions);

    if (permissions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tick at least one permission" },
        { status: 400 },
      );
    }

    role.name = name;
    role.description = body.description?.trim() || "";
    role.permissions = permissions;
    role.isActive = body.isActive !== false;

    await role.save();

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
