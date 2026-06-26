import { NextResponse } from "next/server";
import ColorModel from "@/models/ColorModel";
import { connectDB } from "@/lib/databaseconnection";

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();

    const color = await ColorModel.findByIdAndUpdate(
      id,
      {
        name: body.name,
      },
      { new: true },
    );

    return NextResponse.json({
      success: true,
      data: color,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}
