import { NextResponse } from "next/server";

import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("users.delete");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    // Deleting your own login would end the session you are working in
    if (String(auth.userId) === String(id)) {
      return NextResponse.json(
        { success: false, message: "You cannot delete your own login" },
        { status: 409 },
      );
    }

    const user = await UserModel.findOne({ _id: id, deletedAt: null });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // The shop must keep at least one way in
    if (user.role === "admin") {
      const admins = await UserModel.countDocuments({
        role: "admin",
        deletedAt: null,
        isActive: { $ne: false },
      });

      if (admins <= 1) {
        return NextResponse.json(
          {
            success: false,
            message: "This is the last admin login and cannot be removed.",
          },
          { status: 409 },
        );
      }
    }

    user.deletedAt = new Date();
    user.isActive = false;
    // Old tokens stop working immediately
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    return NextResponse.json({ success: true, message: "User removed" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
