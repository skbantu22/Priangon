import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Brand logo (media URL) shown on the website brand list
    logo: {
      type: String,
      trim: true,
      default: "",
    },

    // Official service centre / importer contact for warranty handover
    serviceCenter: {
      type: String,
      trim: true,
      default: "",
    },

    // Default warranty months offered by this brand
    warrantyMonths: {
      type: Number,
      min: 0,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
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

const BrandModel =
  mongoose.models.Brand || mongoose.model("Brand", brandSchema, "brands");

export default BrandModel;
