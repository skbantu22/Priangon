import { NextResponse } from "next/server";
import slugify from "slugify";
import BrandModel from "@/models/Brand.model";
import { connectDB } from "@/lib/databaseconnection";

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

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

    // Another brand must not already hold this name or slug
    const duplicate = await BrandModel.findOne({
      _id: { $ne: id },
      $or: [{ name: new RegExp(`^${name}$`, "i") }, { slug }],
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Another brand already uses this name",
        },
        { status: 409 },
      );
    }

    const brand = await BrandModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        name,
        slug,
        logo: body.logo?.trim() || "",
        serviceCenter: body.serviceCenter?.trim() || "",
        warrantyMonths: Number(body.warrantyMonths) || 0,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
      { new: true, runValidators: true },
    );

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Another brand already uses this name",
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
