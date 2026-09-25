import mongoose from "mongoose";

/** Why goods go back to a supplier — damaged, wrong item, expired */
const purchaseReturnTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Return type is required"],
      trim: true,
      maxlength: 150,
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.PurchaseReturnType ||
  mongoose.model("PurchaseReturnType", purchaseReturnTypeSchema);
