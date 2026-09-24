import { NextResponse } from "next/server";
import SupplierModel from "@/models/Supplier.model";
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
    const phone = body.phone?.trim();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Supplier name and phone are required" },
        { status: 400 },
      );
    }

    const duplicate = await SupplierModel.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${name}$`, "i"),
      phone,
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Another supplier already uses this name and phone",
        },
        { status: 409 },
      );
    }

    const supplier = await SupplierModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        name,
        phone,
        companyName: body.companyName?.trim() || "",
        email: body.email?.trim() || "",
        address: body.address?.trim() || "",
        openingBalance: Number(body.openingBalance) || 0,
        note: body.note?.trim() || "",
        isActive: body.isActive !== false,
      },
      { new: true, runValidators: true },
    );

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
