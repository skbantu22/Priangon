import { NextResponse } from "next/server";
import ShowroomOrder from "@/models/posorder.model";
import { connectDB } from "@/lib/databaseconnection";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // ✅ FIX
    const { id } = await params;

    console.log("PARAM ID:", id);

    const order = await ShowroomOrder.findById(id);

    console.log("ORDER:", order);

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
