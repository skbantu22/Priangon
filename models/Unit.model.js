import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Unit name is required"],
      unique: true,
      trim: true,
    },

    // Short form printed on invoices / barcode labels, e.g. "Pcs", "Box"
    shortName: {
      type: String,
      required: [true, "Short name is required"],
      trim: true,
    },

    // How many base units one of this unit holds, e.g. 1 Box = 12 Pcs
    baseValue: {
      type: Number,
      min: 1,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

const UnitModel =
  mongoose.models.Unit || mongoose.model("Unit", unitSchema, "units");

export default UnitModel;
