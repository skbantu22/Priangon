import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * One month's salary for one branch, like 360's salary sheets. Each line
 * keeps the employee's name and designation as they were when paid.
 */
const salaryItemSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    name: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    salary: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deduction: { type: Number, default: 0, min: 0 },
    net: { type: Number, default: 0, min: 0 },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const salarySheetSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null },
    branchName: { type: String, trim: true, default: "" },
    paidDate: { type: Date, required: true, index: true },
    method: { type: String, default: "cash" },
    total: { type: Number, default: 0, min: 0 },
    items: { type: [salaryItemSchema], default: [] },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

salarySheetSchema.index({ year: 1, month: 1, showroomId: 1 });

salarySheetSchema.plugin(activityLog, { module: "Salary", label: "branchName" });

export default mongoose.models.SalarySheet || mongoose.model("SalarySheet", salarySheetSchema, "salary_sheets");
