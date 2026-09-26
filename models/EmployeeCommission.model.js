import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Commission money moving for an employee: "earned" when a commission is
 * given (for a sale or a target), "paid" when it is handed over. Due is
 * earned minus paid.
 */
const employeeCommissionSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    type: { type: String, enum: ["earned", "paid"], required: true, index: true },
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, default: "cash" },
    // the invoice or reason it is for, like "INV-000012" or "September target"
    reference: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

employeeCommissionSchema.plugin(activityLog, { module: "Commission", label: "reference" });

export default mongoose.models.EmployeeCommission ||
  mongoose.model("EmployeeCommission", employeeCommissionSchema, "employee_commissions");
