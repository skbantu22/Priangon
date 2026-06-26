import { NextResponse } from "next/server";
import ColorModel from "@/models/ColorModel";
import { connectDB } from "@/lib/databaseconnection";

export async function GET() {
  try {
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
