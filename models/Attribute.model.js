import mongoose from "mongoose";

export const ATTRIBUTE_SLOTS = ["size", "color", "spec"];

const attributeValueSchema = new mongoose.Schema(
  {
    // What staff see in the dropdown, e.g. "8GB / 128GB"
    label: { type: String, required: true, trim: true },

    // What gets stored on the variant, e.g. "8/128"
    value: { type: String, required: true, trim: true },

    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const attributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Attribute name is required"],
      unique: true,
      trim: true,
    },

    /**
     * Where this attribute's values are offered.
     *
     * "size"  fills the variant Size dropdown, which for a phone shop
     *         holds RAM/Storage rather than clothing sizes
     * "color" fills the variant Color field
     * "spec"  is descriptive only, e.g. Network or Display
     */
    slot: {
      type: String,
      enum: ATTRIBUTE_SLOTS,
      default: "spec",
      index: true,
    },

    values: { type: [attributeValueSchema], default: [] },

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

const AttributeModel =
  mongoose.models.Attribute ||
  mongoose.model("Attribute", attributeSchema, "attributes");

export default AttributeModel;
