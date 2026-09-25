import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

/** Switches a supplier between active and inactive */
export async function POST(req, { params }) {
  try {
    const auth = await requirePermission("suppliers.manage");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const supplier = mongoose.isValidObjectId(id)
      ? await SupplierModel.findOne({ _id: id, deletedAt: null })
      : null;

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    supplier.isActive = !supplier.isActive;
    await supplier.save();

    return NextResponse.json({
      success: true,
      message: supplier.isActive ? "Supplier activated" : "Supplier deactivated",
      data: { isActive: supplier.isActive },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
