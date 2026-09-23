import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      unique: true,
      index: true,
    },

    address: {
      type: String,
      default: "",
    },

    // which rate of the price list this customer buys at
    type: {
      type: String,
      enum: ["retail", "dealer", "subDealer", "retailer"],
      default: "retail",
      index: true,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    totalSpent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
