import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * A VAT / SD group products are tagged with (Settings → VAT Settings).
 * The POS adds `percent` on top of a line's price for products in it.
 */
const vatGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: 100,
    },

    percent: { type: Number, required: true, min: 0, max: 100 },

    isActive: { type: Boolean, default: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

vatGroupSchema.plugin(activityLog, { module: "VAT Group", label: "name" });

const VatGroupModel = mongoose.models.VatGroup || mongoose.model("VatGroup", vatGroupSchema, "vatgroups");

export default VatGroupModel;
