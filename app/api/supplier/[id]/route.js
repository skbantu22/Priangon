import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { supplierBalance } from "@/lib/supplierService";

/** One supplier with their balance, for the payment and ledger screens */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const supplier = await SupplierModel.findOne({ _id: id, deletedAt: null }).lean();

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...supplier, balance: await supplierBalance(supplier) },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
