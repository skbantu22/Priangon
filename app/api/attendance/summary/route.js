import { NextResponse } from "next/server";

import Employee from "@/models/Employee.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { employeeScope, monthAttendance } from "@/lib/attendance";

/**
 * GET ?year&month&showroomId — each active employee's month: present, absent,
 * half and leave days, and the salary cut they cost.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ success: false, message: "Pick the month and year" }, { status: 400 });
    }

    const employees = await Employee.find({ deletedAt: null, isActive: true, ...employeeScope(searchParams.get("showroomId")) })
      .select("name designation salary joiningDate")
      .sort({ name: 1 })
      .lean();

    const sums = await monthAttendance({ year, month, employees });
    const data = employees.map((e, i) => ({ _id: String(e._id), name: e.name, designation: e.designation, ...sums[i] }));

    return NextResponse.json({
      success: true,
      data,
      totals: {
        salary: data.reduce((s, r) => s + r.salary, 0),
        deduction: data.reduce((s, r) => s + r.deduction, 0),
        payable: data.reduce((s, r) => s + r.payable, 0),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
