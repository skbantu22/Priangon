import mongoose from "mongoose";

import Attendance, { ATTENDANCE_STATUSES } from "@/models/Attendance.model";

export { ATTENDANCE_STATUSES };

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");

/** Today in Bangladesh, as "YYYY-MM-DD" */
export const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

/** A stored date as the Bangladesh "YYYY-MM-DD" */
export const dayKeyOf = (value) => new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

export const isDayKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** The employee filter the screens share: "head" = head office, an id = that branch, empty = everyone */
export function employeeScope(showroomId) {
  if (showroomId === "head") return { showroomId: null };
  if (mongoose.isValidObjectId(showroomId)) return { showroomId: new mongoose.Types.ObjectId(showroomId) };
  return {};
}

/**
 * Attendance for one month, per employee, and what it costs on the salary.
 *
 *   per day   = monthly salary ÷ days in the month
 *   deduction = per day × (absent days + ½ for each half day)
 *
 * Present and paid-leave days cost nothing. A day nobody marked is counted
 * as "not marked" and is not deducted, so a forgotten day never takes pay.
 * Days before the joining date and days still to come are not counted.
 */
export async function monthAttendance({ year, month, employees }) {
  const days = daysInMonth(year, month);
  const first = `${year}-${pad(month)}-01`;
  const last = `${year}-${pad(month)}-${pad(days)}`;
  const today = todayKey();

  const ids = employees.map((employee) => employee._id);
  const rows = ids.length
    ? await Attendance.find({ employeeId: { $in: ids }, date: { $gte: first, $lte: last } })
        .select("employeeId date status")
        .lean()
    : [];

  const byEmployee = new Map();
  for (const row of rows) {
    const key = String(row.employeeId);
    if (!byEmployee.has(key)) byEmployee.set(key, new Map());
    byEmployee.get(key).set(row.date, row.status);
  }

  return employees.map((employee) => {
    const marks = byEmployee.get(String(employee._id)) || new Map();
    const joined = employee.joiningDate ? dayKeyOf(employee.joiningDate) : first;

    const count = { present: 0, absent: 0, half: 0, leave: 0 };
    for (const status of marks.values()) if (count[status] !== undefined) count[status] += 1;

    // days that could have been marked: from the joining day (or the 1st) up to today
    let counted = 0;
    for (let day = 1; day <= days; day++) {
      const key = `${year}-${pad(month)}-${pad(day)}`;
      if (key >= joined && key <= today) counted += 1;
    }
    const marked = count.present + count.absent + count.half + count.leave;
    const unmarked = Math.max(0, counted - marked);

    const salary = Number(employee.salary) || 0;
    const perDay = round(salary / days);
    const deductDays = count.absent + count.half * 0.5;
    const deduction = Math.min(salary, round(perDay * deductDays));

    return {
      employeeId: String(employee._id),
      days,
      ...count,
      unmarked,
      salary,
      perDay,
      deductDays,
      deduction,
      payable: Math.max(0, round(salary - deduction)),
    };
  });
}
