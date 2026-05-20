import mongoose from "mongoose";

const showroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Showroom =
  mongoose.models.Showroom || mongoose.model("Showroom", showroomSchema);

export default Showroom;
