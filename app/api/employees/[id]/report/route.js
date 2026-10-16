import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Employee from "@/models/Employee.model";
import EmployeeCommission from "@/models/EmployeeCommission.model";
import SalarySheet from "@/models/SalarySheet.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { monthAttendance } from "@/lib/attendance";

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * GET ?year — one employee's year, month by month: the attendance (present,
 * absent, half, leave, not marked and what it costs), the salary that was
 * paid, and the commission earned and paid.
 */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const employee = mongoose.isValidObjectId(id)
      ? await Employee.findOne({ _id: id, deletedAt: null }).populate("showroomId", "name").lean()
      : null;
    if (!employee) return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });

    const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear();
    const employeeId = new mongoose.Types.ObjectId(id);

    // attendance for each month, worked out the way the salary sheet does it
    const attendance = await Promise.all(
      Array.from({ length: 12 }, (_, i) => monthAttendance({ year, month: i + 1, employees: [employee] }).then((rows) => rows[0])),
    );

    const [sheets, commission, commissionAll] = await Promise.all([
      SalarySheet.find({ deletedAt: null, year, "items.employeeId": employeeId })
        .select("month paidDate method items.$")
        .lean(),
      EmployeeCommission.aggregate([
        {
          $match: {
            employeeId,
            deletedAt: null,
            date: { $gte: new Date(`${year}-01-01T00:00:00+06:00`), $lt: new Date(`${year + 1}-01-01T00:00:00+06:00`) },
          },
        },
        {
          $group: {
            _id: { month: { $month: { date: "$date", timezone: "+06:00" } }, type: "$type" },
            amount: { $sum: "$amount" },
          },
        },
      ]),
      EmployeeCommission.aggregate([
        { $match: { employeeId, deletedAt: null } },
        { $group: { _id: "$type", amount: { $sum: "$amount" } } },
      ]),
    ]);

    const sheetBy = new Map(sheets.map((s) => [s.month, s]));
    const commissionBy = new Map(commission.map((c) => [`${c._id.month}:${c._id.type}`, c.amount]));

    const months = attendance.map((a, i) => {
      const month = i + 1;
      const sheet = sheetBy.get(month);
      const line = sheet?.items?.[0];
      return {
        month,
        present: a.present,
        absent: a.absent,
        half: a.half,
        leave: a.leave,
        unmarked: a.unmarked,
        perDay: a.perDay,
        attendanceCut: a.deduction,
        salaryPaid: line
          ? { salary: line.salary, bonus: line.bonus, deduction: line.deduction, net: line.net, paidDate: sheet.paidDate, method: sheet.method }
          : null,
        commissionEarned: round(commissionBy.get(`${month}:earned`)),
        commissionPaid: round(commissionBy.get(`${month}:paid`)),
      };
    });

    const sum = (pick) => round(months.reduce((total, m) => total + (Number(pick(m)) || 0), 0));

    const earnedAll = commissionAll.find((c) => c._id === "earned")?.amount || 0;
    const paidAll = commissionAll.find((c) => c._id === "paid")?.amount || 0;

    return NextResponse.json({
      success: true,
      employee: {
        _id: String(employee._id),
        name: employee.name,
        designation: employee.designation,
        branch: employee.showroomId?.name || "Head Office",
        mobile: employee.mobile,
        email: employee.email,
        address: employee.address,
        nid: employee.nid,
        picture: employee.picture?.url || "",
        joiningDate: employee.joiningDate,
        salary: employee.salary,
        isActive: employee.isActive,
      },
      year,
      months,
      totals: {
        present: sum((m) => m.present),
        absent: sum((m) => m.absent),
        half: sum((m) => m.half),
        leave: sum((m) => m.leave),
        attendanceCut: sum((m) => m.attendanceCut),
        salaryNet: sum((m) => m.salaryPaid?.net),
        bonus: sum((m) => m.salaryPaid?.bonus),
        deduction: sum((m) => m.salaryPaid?.deduction),
        commissionEarned: sum((m) => m.commissionEarned),
        commissionPaid: sum((m) => m.commissionPaid),
      },
      commissionDue: round(earnedAll - paidAll),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
