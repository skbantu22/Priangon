import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { dueInvoices } from "@/lib/supplierService";

/** The supplier's purchases that still carry a due */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: await dueInvoices(id) });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
