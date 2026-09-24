import { NextResponse } from "next/server";
import UnitModel from "@/models/Unit.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function PUT(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

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

    const duplicate = await UnitModel.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${name}$`, "i"),
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Another unit already uses this name",
        },
        { status: 409 },
      );
    }

    const unit = await UnitModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        name,
        shortName,
        baseValue: Number(body.baseValue) || 1,
        isActive: body.isActive !== false,
      },
      { new: true, runValidators: true },
    );

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: unit,
    });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Another unit already uses this name",
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
