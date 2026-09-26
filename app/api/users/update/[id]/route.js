import { NextResponse } from "next/server";
import mongoose from "mongoose";

import UserModel from "@/models/User.model";
import RoleModel from "@/models/Role.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { isValidBdMobile, normalizeBdMobile } from "@/lib/bdFormat";
import { PARTNER_ROLES } from "@/lib/priceTiers";

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission("users.edit");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();

    const user = await UserModel.findOne({ _id: id, deletedAt: null });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 },
      );
    }

    const duplicate = await UserModel.findOne({
      _id: { $ne: id },
      email: new RegExp(`^${escapeRegex(email)}$`, "i"),
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "Another user already uses this email" },
        { status: 409 },
      );
    }

    if (body.phone && !isValidBdMobile(body.phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a Bangladeshi mobile number (01XXXXXXXXX)",
        },
        { status: 400 },
      );
    }

    const isPartner = PARTNER_ROLES.includes(user.role);

    // a partner keeps its type; staff roles do not apply to it
    if (!isPartner && mongoose.isValidObjectId(body.roleId)) {
      const role = await RoleModel.findOne({
        _id: body.roleId,
        deletedAt: null,
      });

      if (!role) {
        return NextResponse.json(
          { success: false, message: "Role not found" },
          { status: 404 },
        );
      }

      user.roleId = role._id;

      // Keep the key in step, since the proxy and older checks read it
      if (role.systemKey) user.role = role.systemKey;
    }

    user.name = name;
    user.email = email;
    user.phone = body.phone ? normalizeBdMobile(body.phone) : "";

    if (mongoose.isValidObjectId(body.showroomId)) {
      user.showroomId = body.showroomId;
    } else if (body.showroomId === "") {
      user.showroomId = null;
    }

    if (typeof body.isActive === "boolean") user.isActive = body.isActive;
    if (isPartner && typeof body.canOrder === "boolean") user.canOrder = body.canOrder;

    // Changing a password signs the old sessions out
    if (body.password) {
      if (String(body.password).length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }

      user.password = body.password;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "User updated",
      data: { _id: user._id },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
