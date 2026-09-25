import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    // Due carried over from before this software was used
    openingBalance: {
      type: Number,
      default: 0,
    },

    // Money already sitting with the supplier on the day they were added
    initialAdvance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // The day the opening due and advance were counted
    openingDate: {
      type: Date,
      default: null,
    },

    // The supplier's sales rep and delivery rep, who the shop actually calls
    srName: { type: String, trim: true, default: "" },
    srMobile: { type: String, trim: true, default: "" },
    dsrName: { type: String, trim: true, default: "" },
    dsrMobile: { type: String, trim: true, default: "" },

    note: {
      type: String,
      trim: true,
      default: "",
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

supplierSchema.index({ name: 1, phone: 1 }, { unique: true });

const SupplierModel =
  mongoose.models.Supplier ||
  mongoose.model("Supplier", supplierSchema, "suppliers");

export default SupplierModel;
