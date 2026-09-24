import { NextResponse } from "next/server";
import BrandModel from "@/models/Brand.model";
import ProductModel from "@/models/Product.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const brand = await BrandModel.findOne({ _id: id, deletedAt: null });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand not found",
        },
        { status: 404 },
      );
    }

    // Products still store the brand by name, so block deleting a brand in use
    const inUse = await ProductModel.countDocuments({
      brand: new RegExp(`^${brand.name}$`, "i"),
      deletedAt: null,
    });

    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${inUse} product(s) still use this brand. Change those products first.`,
        },
        { status: 409 },
      );
    }

    brand.deletedAt = new Date();
    await brand.save();

    return NextResponse.json({
      success: true,
      message: "Brand moved to trash",
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
