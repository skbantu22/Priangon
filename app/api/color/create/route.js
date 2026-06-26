import { NextResponse } from "next/server";
import ColorModel from "@/models/ColorModel";
import { connectDB } from "@/lib/databaseconnection";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const color = await ColorModel.create({
      name: body.name,
    });

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
