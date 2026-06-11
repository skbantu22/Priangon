import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true, // steadfast, redx, pathao
      lowercase: true,
      trim: true,
    },

    apiUrl: {
      type: String,
      required: true,
      trim: true,
    },

    apiKey: {
      type: String,
      default: "",
    },

    secretKey: {
      type: String,
      default: "",
    },

    webhookUrl: {
      type: String,
      default: "",
    },

    sandboxMode: {
      type: Boolean,
      default: false,
    },

    isCODSupported: {
      type: Boolean,
      default: true,
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

export default mongoose.models.Courier ||
  mongoose.model("Courier", courierSchema);
