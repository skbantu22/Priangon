import { NextResponse } from "next/server";
import slugify from "slugify";
import BrandModel from "@/models/Brand.model";
import { connectDB } from "@/lib/databaseconnection";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand name is required",
        },
        { status: 400 },
      );
    }

    const slug = slugify(name, { lower: true, strict: true });

    // A soft deleted brand still owns its name, so match those too
    const existingBrand = await BrandModel.findOne({
      $or: [{ name: new RegExp(`^${name}$`, "i") }, { slug }],
    });

    if (existingBrand) {
      return NextResponse.json(
        {
          success: false,
          message: existingBrand.deletedAt
            ? "This brand is in the trash. Restore it instead."
            : "Brand already exists",
        },
        { status: 409 },
      );
    }

    const brand = await BrandModel.create({
      name,
      slug,
      logo: body.logo?.trim() || "",
      serviceCenter: body.serviceCenter?.trim() || "",
      warrantyMonths: Number(body.warrantyMonths) || 0,
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder) || 0,
    });

    return NextResponse.json(
      {
        success: true,
        data: brand,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand already exists",
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
