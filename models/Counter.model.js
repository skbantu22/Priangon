import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Counter ||
  mongoose.model("Counter", CounterSchema);
