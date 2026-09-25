import mongoose from "mongoose";

/** What kind of thing an asset is — furniture, a vehicle, a computer */
const assetTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Asset type is required"],
      trim: true,
      maxlength: 150,
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.AssetType ||
  mongoose.model("AssetType", assetTypeSchema);
