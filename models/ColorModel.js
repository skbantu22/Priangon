import mongoose from "mongoose";

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const ColorModel =
  mongoose.models.Color || mongoose.model("Color", colorSchema);

export default ColorModel;
