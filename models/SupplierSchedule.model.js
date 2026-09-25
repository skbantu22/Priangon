import mongoose from "mongoose";

/** A planned visit or payment date for a supplier */
const supplierScheduleSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },

    scheduledAt: { type: Date, required: true, index: true },

    purpose: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
      index: true,
    },

    doneAt: { type: Date, default: null },

    createdBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.SupplierSchedule ||
  mongoose.model("SupplierSchedule", supplierScheduleSchema);
