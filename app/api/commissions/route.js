import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Employee from "@/models/Employee.model";
import EmployeeCommission from "@/models/EmployeeCommission.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { PAY_METHODS, commissionSummary, dayDate } from "@/lib/employeeService";

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * GET — Sales Commissions: earned / paid / due per employee
 * GET ?list=earned|paid — every commission given or paid, newest first
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const list = new URL(req.url).searchParams.get("list");

    if (list === "earned" || list === "paid") {
      const rows = await EmployeeCommission.find({ deletedAt: null, type: list })
        .populate("employeeId", "name designation")
        .sort({ date: -1, createdAt: -1 })
        .lean();
      return NextResponse.json({ success: true, data: rows });
    }

    return NextResponse.json({ success: true, data: await commissionSummary() });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST { employeeId, type: "earned" | "paid", amount, date, method, reference, note } */
export async function POST(req) {
  try {
    const auth = await requirePermission("employees.commission");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const fail = (message) => NextResponse.json({ success: false, message }, { status: 400 });

    if (!mongoose.isValidObjectId(body.employeeId)) return fail("Select an employee");
    const employee = await Employee.findOne({ _id: body.employeeId, deletedAt: null }).select("name").lean();
    if (!employee) return fail("Employee not found");

    const type = body.type === "paid" ? "paid" : "earned";
    const amount = round(body.amount);
    if (!(amount > 0)) return fail("Enter an amount greater than 0");

    const date = dayDate(body.date);
    if (!date) return fail("Pick a date");

    if (type === "paid") {
      const summary = (await commissionSummary()).find((row) => String(row._id) === String(employee._id));
      if (amount - (summary?.due || 0) > 0.009) return fail(`Only ${summary?.due || 0} commission is due to ${employee.name}`);
    }

    const row = await EmployeeCommission.create({
      employeeId: employee._id,
      type,
      amount,
      date,
      method: PAY_METHODS.includes(body.method) ? body.method : "cash",
      reference: String(body.reference || "").trim().slice(0, 120),
      note: String(body.note || "").trim().slice(0, 2000),
      createdBy: await actorFullName(auth),
    });

    return NextResponse.json(
      { success: true, message: type === "paid" ? `Commission paid to ${employee.name}` : `Commission added for ${employee.name}`, data: row },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
