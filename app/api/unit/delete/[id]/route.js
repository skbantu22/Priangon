import { NextResponse } from "next/server";
import UnitModel from "@/models/Unit.model";
import ProductModel from "@/models/Product.model";
import { connectDB } from "@/lib/databaseconnection";

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const unit = await UnitModel.findOne({ _id: id, deletedAt: null });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found",
        },
        { status: 404 },
      );
    }

    // Products store the unit by name, so block deleting a unit in use
    const inUse = await ProductModel.countDocuments({
      unit: new RegExp(`^${unit.name}$`, "i"),
      deletedAt: null,
    });

    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${inUse} product(s) still use this unit. Change those products first.`,
        },
        { status: 409 },
      );
    }

    unit.deletedAt = new Date();
    await unit.save();

    return NextResponse.json({
      success: true,
      message: "Unit moved to trash",
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
