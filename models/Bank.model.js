import mongoose from "mongoose";

// The Banks list of AmarSolution: the banks a shop deals with, picked when a bank / card / cheque account is made
const bankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    branch: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },

    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null, index: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.Bank || mongoose.model("Bank", bankSchema, "banks");
