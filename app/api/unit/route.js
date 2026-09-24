import { NextResponse } from "next/server";
import UnitModel from "@/models/Unit.model";
import { connectDB } from "@/lib/databaseconnection";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    // ?active=true limits the list to units usable on new products
    if (searchParams.get("active") === "true") {
      filter.isActive = true;
    }

    const units = await UnitModel.find(filter).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: units,
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
