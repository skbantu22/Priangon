import mongoose from "mongoose";

const PracticeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    category: {
      type: String, // simple for practice (no ObjectId first)
      required: true,
      trim: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent model overwrite
const PracticeModel =
  mongoose.models.Practice ||
  mongoose.model("Practice", PracticeSchema);

export default PracticeModel;
