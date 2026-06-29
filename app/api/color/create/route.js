import { NextResponse } from "next/server";
import ColorModel from "@/models/ColorModel";
import { connectDB } from "@/lib/databaseconnection";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const name = body.name?.trim().toLowerCase();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Color name is required",
        },
        { status: 400 },
      );
    }

    const existingColor = await ColorModel.findOne({ name });

    if (existingColor) {
      return NextResponse.json(
        {
          success: false,
          message: "Color already exists",
        },
        { status: 409 },
      );
    }

    const color = await ColorModel.create({ name });

    return NextResponse.json(
      {
        success: true,
        data: color,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Color already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
