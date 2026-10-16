import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Attendance from "@/models/Attendance.model";
import Employee from "@/models/Employee.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

/**
 * GET ?employeeId&year — one employee's year: for every month the days present,
 * absent, half and on leave, with the dates of the days that were not "present".
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    if (!mongoose.isValidObjectId(employeeId)) {
      return NextResponse.json({ success: false, message: "Choose an employee" }, { status: 400 });
    }

    const employee = await Employee.findOne({ _id: employeeId, deletedAt: null }).select("name designation salary").lean();
    if (!employee) return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });

    const marks = await Attendance.find({ employeeId, date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } })
      .select("date status note")
      .sort({ date: 1 })
      .lean();

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      present: 0,
      absent: 0,
      half: 0,
      leave: 0,
      leaveDates: [],
      absentDates: [],
      halfDates: [],
    }));

    for (const mark of marks) {
      const row = months[Number(mark.date.slice(5, 7)) - 1];
      row[mark.status] += 1;
      if (mark.status === "leave") row.leaveDates.push(mark.date);
      if (mark.status === "absent") row.absentDates.push(mark.date);
      if (mark.status === "half") row.halfDates.push(mark.date);
    }

    const totals = months.reduce(
      (sum, m) => ({ present: sum.present + m.present, absent: sum.absent + m.absent, half: sum.half + m.half, leave: sum.leave + m.leave }),
      { present: 0, absent: 0, half: 0, leave: 0 },
    );

    return NextResponse.json({
      success: true,
      employee: { _id: String(employee._id), name: employee.name, designation: employee.designation, salary: employee.salary },
      year,
      months,
      totals,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
