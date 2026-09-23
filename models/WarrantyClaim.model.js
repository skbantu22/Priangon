import mongoose from "mongoose";

// A customer bringing a sold unit back under warranty (repair / replace)
export const CLAIM_STATUSES = [
  "received", // taken in at the counter
  "sent_to_service", // sent to brand service center
  "repaired",
  "replaced",
  "delivered", // handed back to the customer
  "rejected", // not covered (physical / water damage, expired...)
];

const warrantyClaimSchema = new mongoose.Schema(
  {
    claimNumber: { type: String, required: true, unique: true, trim: true },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "POSOrder",
      required: true,
      index: true,
    },
    orderNumber: { type: String, trim: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    productName: { type: String, required: true, trim: true },
    variantLabel: { type: String, trim: true, default: "" },

    imei: { type: String, trim: true, default: "", index: true },

    customerName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "", index: true },

    warrantyExpiry: { type: Date, default: null },
    underWarranty: { type: Boolean, default: true },

    issue: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: CLAIM_STATUSES,
      default: "received",
      index: true,
    },
    notes: { type: String, trim: true, default: "" },

    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom" },
    receivedBy: { type: String, trim: true, default: "" },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const WarrantyClaim =
  mongoose.models.WarrantyClaim ||
  mongoose.model("WarrantyClaim", warrantyClaimSchema, "warrantyclaims");

export default WarrantyClaim;
