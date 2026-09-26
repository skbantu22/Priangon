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

    await ColorModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Color deleted successfully",
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
