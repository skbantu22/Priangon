import { NextResponse } from "next/server";
import BrandModel from "@/models/Brand.model";
import { connectDB } from "@/lib/databaseconnection";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    // ?active=true limits the list to brands usable on new products
    if (searchParams.get("active") === "true") {
      filter.isActive = true;
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const brands = await BrandModel.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });

    return NextResponse.json({
      success: true,
      data: brands,
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
