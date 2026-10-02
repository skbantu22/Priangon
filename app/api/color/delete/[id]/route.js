import { NextResponse } from "next/server";
import mongoose from "mongoose";

import ColorModel from "@/models/ColorModel";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

// The sign-in check used to sit outside this function, at the top of the
// file. Loading the file then awaited it forever, which hung `next build`
// on "Collecting page data".
export async function DELETE(req, { params }) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Color not found" }, { status: 404 });
    }

    // moved to the trash, not wiped — the trash clears it after 30 days
    const color = await ColorModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );

    if (!color) {
      return NextResponse.json({ success: false, message: "Color not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Color moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
