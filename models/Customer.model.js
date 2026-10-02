import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    businessName: { type: String, trim: true, default: "" },

    // customer photo (media URL)
    photo: { type: String, trim: true, default: "" },

    area: { type: String, trim: true, default: "" },
    membershipNumber: { type: String, trim: true, default: "" },
    // attachment (media URL: image or PDF)
    attachment: { type: String, trim: true, default: "" },

    phone: {
      type: String,
      unique: true,
      index: true,
    },

    email: { type: String, trim: true, lowercase: true, default: "" },

    address: {
      type: String,
      default: "",
    },

    // which rate of the price list this customer buys at
    type: {
      type: String,
      enum: ["retail", "dealer", "subDealer", "wholesaler"],
      default: "retail",
      index: true,
    },

    // what they owed / had paid ahead before their first sale in this app
    openingDue: { type: Number, default: 0, min: 0 },
    initialAdvance: { type: Number, default: 0, min: 0 },
    openingDate: { type: Date, default: null },

    note: { type: String, trim: true, default: "" },

    isActive: { type: Boolean, default: true, index: true },

    totalOrders: {
      type: Number,
      default: 0,
    },

    totalSpent: {
      type: Number,
      default: 0,
    },

    // deleting a customer only stamps this; the trash wipes it after 30 days
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  },
);

CustomerSchema.plugin(activityLog, { module: "Customer", label: "name" });

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
