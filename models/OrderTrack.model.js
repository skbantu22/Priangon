import mongoose from "mongoose";

const TrackSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      // Matches the enum in your Order model for consistency
      enum: [
        "initiated",
        "pending",
        "unpaid",
        "success",
        "failed",
        "cancelled",
        "processing",
        "shipped",
        "delivered",
        "unverified",
      ],
    },
    message: {
      type: String,
      default: "",
    }, // e.g., "Your order has been picked up by the courier."
    location: {
      type: String,
      default: "Dhaka, Bangladesh",
    }, // Useful for showing which hub the product is at
  },
  {
    timestamps: true, // This automatically gives you 'createdAt' for the timeline
  },
);

export default mongoose.models.Track || mongoose.model("Track", TrackSchema);
