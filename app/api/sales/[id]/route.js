import mongoose from "mongoose";
import { NextResponse } from "next/server";

import POSOrder from "@/models/posorder.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission, requirePermission } from "@/lib/apiAuth";
import { returnableSale } from "@/lib/saleReturnService";

/** One sale with, per row, what can still be returned — for the Sale Return screen */
export async function GET(req, { params }) {
  try {
    const auth = await requireAnyPermission(["orders.view", "pos.return"]);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const sale = await returnableSale(id);

    if (!sale) return NextResponse.json({ success: false, message: "Sale not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** PATCH { remark } — the sale's remark, like 360's "Edit Remark" */
export async function PATCH(req, { params }) {
  try {
    const auth = await requirePermission("orders.edit");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: "Sale not found" }, { status: 404 });

    const { remark } = await req.json();
    const sale = await POSOrder.findOneAndUpdate({ _id: id }, { $set: { remark: String(remark || "").trim().slice(0, 1000) } }, { new: true });

    if (!sale) return NextResponse.json({ success: false, message: "Sale not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Remark saved" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
