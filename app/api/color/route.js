import { NextResponse } from "next/server";
import ColorModel from "@/models/ColorModel";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET() {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const colors = await ColorModel.find().sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: colors,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}
