import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/** Something the shop bought to keep and use, not to sell */
const assetSchema = new mongoose.Schema(
  {
    assetDate: { type: Date, default: Date.now, index: true },

    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssetType",
      required: true,
      index: true,
    },

    // Kept on the row so an old asset still reads correctly after the
    // type is renamed or deleted
    typeName: { type: String, trim: true, default: "" },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be more than zero"],
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bkash", "nagad", "bank", "cheque", "card", "other"],
      default: "cash",
    },

    reference: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

assetSchema.plugin(activityLog, { module: "Asset", label: "typeName" });

export default mongoose.models.Asset || mongoose.model("Asset", assetSchema);
