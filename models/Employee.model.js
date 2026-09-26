import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/** A person on the payroll, like 360's employees. showroomId empty = head office / main */
const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Employee name is required"], trim: true, maxlength: 255 },
    designation: { type: String, required: [true, "Designation is required"], trim: true, maxlength: 120 },
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null, index: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    mobile: { type: String, required: [true, "Mobile is required"], trim: true, maxlength: 30 },
    nid: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    picture: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    joiningDate: { type: Date, default: Date.now },
    // monthly salary, the starting figure on every salary sheet
    salary: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

employeeSchema.plugin(activityLog, { module: "Employee", label: "name" });

export default mongoose.models.Employee || mongoose.model("Employee", employeeSchema, "employees");
