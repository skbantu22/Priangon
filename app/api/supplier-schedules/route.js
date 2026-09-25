import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierSchedule from "@/models/SupplierSchedule.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorName, requirePermission } from "@/lib/apiAuth";
import { readSchedule } from "@/lib/supplierService";

/** Schedules for the pending / done / all tabs, with a count for each */
export async function GET(req) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || "pending";
    const supplierId = searchParams.get("supplierId");

    const base = mongoose.isValidObjectId(supplierId) ? { supplierId } : {};

    const [rows, pending, done] = await Promise.all([
      SupplierSchedule.find({ ...base, ...(status !== "all" && { status }) })
        .populate({ path: "supplierId", select: "name phone" })
        .sort({ scheduledAt: status === "done" ? -1 : 1 })
        .lean(),
      SupplierSchedule.countDocuments({ ...base, status: "pending" }),
      SupplierSchedule.countDocuments({ ...base, status: "done" }),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      counts: { pending, done, all: pending + done },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("suppliers.manage");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const checked = await readSchedule(body);

    if (checked.error) {
      return NextResponse.json({ success: false, message: checked.error }, { status: 400 });
    }

    const schedule = await SupplierSchedule.create({ ...checked.data, createdBy: actorName(auth) });

    return NextResponse.json({ success: true, message: "Schedule saved", data: schedule });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
