import mongoose from "mongoose";

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Color name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Color name must be at least 2 characters"],
    },

    // deleting a colour only stamps this; the trash screen wipes it later
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  },
);

const ColorModel =
  mongoose.models.Color || mongoose.model("Color", colorSchema);

export default ColorModel;
