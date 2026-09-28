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

    email: {
      type: String,
      trim: true,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    logo: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // The one counter that sells. Stock itself stays in the warehouse.
    isSaleCenter: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Showroom =
  mongoose.models.Showroom || mongoose.model("Showroom", showroomSchema);

export default Showroom;
