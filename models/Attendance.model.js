import mongoose from "mongoose";

/**
 * One employee's attendance for one day. The day is kept as the plain
 * "YYYY-MM-DD" of Bangladesh, so it never slips a day with the time zone.
 * A day with no row is "not marked".
 */
export const ATTENDANCE_STATUSES = ["present", "absent", "half", "leave"];

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    note: { type: String, trim: true, default: "", maxlength: 300 },
    markedBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema, "attendance");
