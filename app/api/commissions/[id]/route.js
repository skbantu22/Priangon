import mongoose from "mongoose";
import { NextResponse } from "next/server";

import EmployeeCommission from "@/models/EmployeeCommission.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { commissionSummary } from "@/lib/employeeService";

/**
 * Deletes a commission given or paid. Taking back an earned commission
 * that was already paid out would leave the employee overpaid, so that is
 * refused.
 */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("employees.commission");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const row = mongoose.isValidObjectId(id) ? await EmployeeCommission.findOne({ _id: id, deletedAt: null }) : null;

    if (!row) return NextResponse.json({ success: false, message: "Commission not found" }, { status: 404 });

    if (row.type === "earned") {
      const summary = (await commissionSummary()).find((s) => String(s._id) === String(row.employeeId));
      if ((summary?.due || 0) - row.amount < -0.009) {
        return NextResponse.json(
          { success: false, message: "Part of this commission is already paid. Delete that payment first." },
          { status: 409 },
        );
      }
    }

    row.deletedAt = new Date();
    await row.save();

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
