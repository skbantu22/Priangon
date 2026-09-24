import { NextResponse } from "next/server";

import RoleModel from "@/models/Role.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { cleanPermissions } from "@/lib/permissions";
import { escapeRegex } from "@/lib/escapeRegex";

export async function POST(req) {
  try {
    const auth = await requirePermission("users.roles");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Role name is required" },
        { status: 400 },
      );
    }

    const permissions = cleanPermissions(body.permissions);

    if (permissions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tick at least one permission" },
        { status: 400 },
      );
    }

    const existing = await RoleModel.findOne({
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
      deletedAt: null,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "A role with this name already exists" },
        { status: 409 },
      );
    }

    const role = await RoleModel.create({
      name,
      description: body.description?.trim() || "",
      permissions,
      isActive: body.isActive !== false,
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A role with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
