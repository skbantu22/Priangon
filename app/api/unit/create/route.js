import { NextResponse } from "next/server";
import UnitModel from "@/models/Unit.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const name = body.name?.trim();
    const shortName = body.shortName?.trim();

    if (!name || !shortName) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit name and short name are both required",
        },
        { status: 400 },
      );
    }

    const existingUnit = await UnitModel.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existingUnit) {
      return NextResponse.json(
        {
          success: false,
          message: existingUnit.deletedAt
            ? "This unit is in the trash. Restore it instead."
            : "Unit already exists",
        },
        { status: 409 },
      );
    }

    const unit = await UnitModel.create({
      name,
      shortName,
      baseValue: Number(body.baseValue) || 1,
      isActive: body.isActive !== false,
    });

    return NextResponse.json(
      {
        success: true,
        data: unit,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit already exists",
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
