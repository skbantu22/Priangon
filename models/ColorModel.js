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
  },
  {
    timestamps: true,
  },
);

const ColorModel =
  mongoose.models.Color || mongoose.model("Color", colorSchema);

export default ColorModel;
