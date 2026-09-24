import { NextResponse } from "next/server";
import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const name = body.name?.trim();
    const phone = body.phone?.trim();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Supplier name and phone are required" },
        { status: 400 },
      );
    }

    const existing = await SupplierModel.findOne({
      name: exactRegex(name),
      phone,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: existing.deletedAt
            ? "This supplier is in the trash. Restore it instead."
            : "A supplier with this name and phone already exists",
        },
        { status: 409 },
      );
    }

    const supplier = await SupplierModel.create({
      name,
      phone,
      companyName: body.companyName?.trim() || "",
      email: body.email?.trim() || "",
      address: body.address?.trim() || "",
      openingBalance: Number(body.openingBalance) || 0,
      note: body.note?.trim() || "",
      isActive: body.isActive !== false,
    });

    return NextResponse.json(
      { success: true, data: supplier },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A supplier with this name and phone already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
