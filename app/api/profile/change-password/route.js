import { NextResponse } from "next/server";

import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ANY_USER } from "@/lib/apiAuth";

/**
 * Changing your own password.
 *
 * The current one is asked for so that a screen left unlocked cannot be
 * used to take the account over, and every other session is signed out
 * afterwards.
 */
export async function POST(req) {
  try {
    const auth = await requireRoles(ANY_USER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Both passwords are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "The new password must be at least 6 characters",
        },
        { status: 400 },
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, message: "The new password is the same as the old one" },
        { status: 400 },
      );
    }

    // password is select:false on the schema
    const user = await UserModel.findById(auth.userId).select("+password");

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Account not found" },
        { status: 404 },
      );
    }

    const matches = await user.comparePassword(currentPassword);

    if (!matches) {
      return NextResponse.json(
        { success: false, message: "The current password is wrong" },
        { status: 400 },
      );
    }

    // The pre-save hook hashes it
    user.password = newPassword;
    // Anything signed with the old token stops working
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password changed. Other devices have been signed out.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
