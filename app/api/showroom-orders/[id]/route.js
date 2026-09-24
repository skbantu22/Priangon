import { NextResponse } from "next/server";
import ShowroomOrder from "@/models/posorder.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(req, { params }) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    // ✅ FIX
    const { id } = await params;

    const order = await ShowroomOrder.findById(id);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.log("PRINT API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
