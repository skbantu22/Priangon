import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

// An order placed by a dealer / sub dealer / wholesaler from the partner portal.
// Staff turn it into a real invoice (POSOrder) at the POS, where IMEIs are
// scanned and stock is taken.
export const PARTNER_ORDER_STATUSES = [
  "pending", // just placed
  "confirmed", // accepted by the shop, being prepared
  "invoiced", // sold at the POS: see posOrderId
  "cancelled",
];

const partnerOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerType: {
      type: String,
      enum: ["dealer", "subDealer", "wholesaler"],
      required: true,
    },
    customerName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },

    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom" },

    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        productName: { type: String, required: true },
        image: String,
        color: String,
        size: String,
        qty: { type: Number, required: true, min: 1 },
        // partner's rate when the order was placed
        price: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
      },
    ],

    total: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: PARTNER_ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    staffNote: { type: String, trim: true, default: "" },
    posOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "POSOrder", default: null },
    invoiceNumber: { type: String, default: "" },
  },
  { timestamps: true },
);

partnerOrderSchema.plugin(activityLog, { module: "Partner Order", label: "orderNumber" });

const PartnerOrder =
  mongoose.models.PartnerOrder ||
  mongoose.model("PartnerOrder", partnerOrderSchema, "partnerorders");

export default PartnerOrder;
