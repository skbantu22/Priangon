import mongoose from "mongoose";

import Employee from "@/models/Employee.model";
import SalarySheet from "@/models/SalarySheet.model";
import EmployeeCommission from "@/models/EmployeeCommission.model";
import Showroom from "@/models/Showroom.model";

/**
 * Employees, salary and commission, like 360's Employees menu. Where 360
 * pays from an account, this app records the payment type (cash, bKash…).
 */

export const PAY_METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const todayBD = () => new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);

/** yyyy-mm-dd → noon that day in Bangladesh, so it never slips a day */
export const dayDate = (value) => {
  const day = String(value || "").slice(0, 10) || todayBD();
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00+06:00`) : null;
};

/** Checks an employee form; shared by create and update */
export async function readEmployee(body) {
  const name = String(body.name || "").trim();
  const designation = String(body.designation || "").trim();
  const mobile = String(body.mobile || "").trim();

  if (!name) return { error: "Enter the employee name" };
  if (!designation) return { error: "Enter the designation" };
  if (!/^[0-9+\-\s]{6,30}$/.test(mobile)) return { error: "Enter a valid mobile number" };

  const salary = round(body.salary);
  if (salary < 0) return { error: "Salary cannot be negative" };

  const joiningDate = dayDate(body.joiningDate);
  if (!joiningDate) return { error: "Pick the joining date" };
  if (joiningDate > new Date()) return { error: "Joining date cannot be in the future" };

  let showroomId = null;
  if (mongoose.isValidObjectId(body.showroomId)) {
    if (!(await Showroom.exists({ _id: body.showroomId }))) return { error: "Branch not found" };
    showroomId = body.showroomId;
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email" };

  return {
    data: {
      name: name.slice(0, 255),
      designation: designation.slice(0, 120),
      showroomId,
      email,
      mobile,
      nid: String(body.nid || "").trim().slice(0, 40),
      address: String(body.address || "").trim().slice(0, 500),
      joiningDate,
      salary,
      ...(body.picture !== undefined && {
        picture: { url: String(body.picture?.url || ""), publicId: String(body.picture?.publicId || "") },
      }),
    },
  };
}

/** Earned, paid and due commission per employee */
export async function commissionSummary() {
  const [employees, sums] = await Promise.all([
    Employee.find({ deletedAt: null }).sort({ name: 1 }).lean(),
    EmployeeCommission.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: { employeeId: "$employeeId", type: "$type" }, amount: { $sum: "$amount" } } },
    ]),
  ]);

  const sumOf = new Map(sums.map((s) => [`${s._id.employeeId}:${s._id.type}`, s.amount]));

  return employees.map((e) => {
    const earned = round(sumOf.get(`${e._id}:earned`));
    const paid = round(sumOf.get(`${e._id}:paid`));
    return {
      _id: e._id,
      name: e.name,
      mobile: e.mobile,
      email: e.email,
      designation: e.designation,
      isActive: e.isActive,
      earned,
      paid,
      due: round(earned - paid),
    };
  });
}

/**
 * The next salary sheet to fill: every active employee of the branch with
 * their monthly salary, and whether that month is already paid.
 */
export async function salaryDraft({ year, month, showroomId }) {
  const branch = mongoose.isValidObjectId(showroomId) ? new mongoose.Types.ObjectId(showroomId) : null;

  const [employees, existing] = await Promise.all([
    Employee.find({ deletedAt: null, isActive: true, showroomId: branch }).sort({ name: 1 }).lean(),
    SalarySheet.findOne({ deletedAt: null, year, month, showroomId: branch }).select("_id").lean(),
  ]);

  return {
    existingId: existing?._id || null,
    employees: employees.map((e) => ({
      _id: e._id,
      name: e.name,
      designation: e.designation,
      salary: e.salary,
    })),
  };
}

/** Saves a month's salary for one branch. Throws with a message for the screen. */
export async function createSalarySheet(body, createdBy) {
  const year = Number(body.year);
  const month = Number(body.month);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Pick the year");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Pick the month");

  const paidDate = dayDate(body.paidDate);
  if (!paidDate) throw new Error("Pick the date it was paid");
  if (paidDate > new Date(Date.now() + 86400000)) throw new Error("The paid date cannot be in the future");

  let branch = null;
  let branchName = "Head Office";
  if (mongoose.isValidObjectId(body.showroomId)) {
    const showroom = await Showroom.findById(body.showroomId).select("name").lean();
    if (!showroom) throw new Error("Branch not found");
    branch = showroom._id;
    branchName = showroom.name;
  }

  if (await SalarySheet.exists({ deletedAt: null, year, month, showroomId: branch })) {
    throw new Error("This month's salary is already paid for this branch");
  }

  const rawItems = (Array.isArray(body.items) ? body.items : []).filter((i) => mongoose.isValidObjectId(i?.employeeId));
  if (!rawItems.length) throw new Error("Tick at least one employee to pay");

  const employees = new Map(
    (await Employee.find({ _id: { $in: rawItems.map((i) => i.employeeId) }, deletedAt: null }).lean()).map((e) => [String(e._id), e]),
  );

  const items = rawItems.map((raw) => {
    const e = employees.get(String(raw.employeeId));
    if (!e) throw new Error("An employee on the sheet no longer exists");
    const salary = round(raw.salary);
    const bonus = round(raw.bonus);
    const deduction = round(raw.deduction);
    if (salary < 0 || bonus < 0 || deduction < 0) throw new Error(`${e.name}: amounts cannot be negative`);
    return {
      employeeId: e._id,
      name: e.name,
      designation: e.designation,
      salary,
      bonus,
      deduction,
      net: Math.max(0, round(salary + bonus - deduction)),
      note: String(raw.note || "").trim().slice(0, 255),
    };
  });

  return SalarySheet.create({
    year,
    month,
    showroomId: branch,
    branchName,
    paidDate,
    method: PAY_METHODS.includes(body.method) ? body.method : "cash",
    total: round(items.reduce((sum, i) => sum + i.net, 0)),
    items,
    note: String(body.note || "").trim().slice(0, 2000),
    createdBy,
  });
}
