import { NextResponse } from "next/server";
import QualityModel from "@/models/Quality.model";
import ProductModel from "@/models/Product.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

export async function PUT(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Quality name is required" }, { status: 400 });
    }

    const current = await QualityModel.findById(id).select("showroomId").lean();
    const owner = current?.showroomId || "warehouse";
    const duplicate = await QualityModel.findOne({
      _id: { $ne: id },
      showroomId: owner === "warehouse" ? { $in: ["warehouse", null, ""] } : owner,
      name: exactRegex(name),
    });

    if (duplicate) {
      return NextResponse.json({ success: false, message: "Another quality already uses this name" }, { status: 409 });
    }

    const quality = await QualityModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { name, isActive: body.isActive !== false, sortOrder: Number(body.sortOrder) || 0 },
      { new: true, runValidators: true },
    );

    if (!quality) {
      return NextResponse.json({ success: false, message: "Quality not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: quality });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Another quality already uses this name" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const quality = await QualityModel.findOne({ _id: id, deletedAt: null });

    if (!quality) {
      return NextResponse.json({ success: false, message: "Quality not found" }, { status: 404 });
    }

    // Products store the quality by name, so block deleting one that is in use
    const inUse = await ProductModel.countDocuments({ quality: exactRegex(quality.name), deletedAt: null });

    if (inUse > 0) {
      return NextResponse.json(
        { success: false, message: `${inUse} product(s) still use this quality. Change those products first.` },
        { status: 409 },
      );
    }

    quality.deletedAt = new Date();
    await quality.save();

    return NextResponse.json({ success: true, message: "Quality moved to trash" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
