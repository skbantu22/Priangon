import mongoose from "mongoose";
import crypto from "crypto";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },
    name: { type: String, default: "" },
    slug: { type: String, default: "" },
    color: { type: String, default: "" },
    size: { type: String, default: "" },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    media: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
  },
  { _id: false },
);

// ✅ NEW: Payment details schema (IMPORTANT FIX)
const PaymentDetailSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["cod", "bkash", "nagad", "online"],
      default: "cod",
    },

    transactionNumber: { type: String, default: null },

    paymentImage: { type: String, default: null }, // 👈 PAYMENT PROOF IMAGE

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    paidAt: { type: Date, default: null },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderNumber: { type: String, unique: true, index: true },

    // ================= CUSTOMER =================
    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      cityId: { type: String, default: "" },
    },

    // ================= ITEMS =================
    items: { type: [OrderItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "BDT" },

    // ================= COUPON =================
    coupon: {
      code: { type: String, default: "" },
      discountPercentage: { type: Number, default: 0 },
    },

    // ================= GLOBAL NOTE (FIX) =================
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // ================= PAYMENT INFO (FIX) =================
    paymentMethodSelected: {
      type: String,
      enum: ["cod", "bkash", "nagad", "online"],
      default: "cod",
      index: true,
    },

    payment: {
      type: PaymentDetailSchema,
      default: () => ({}),
    },

    payments: {
      type: [PaymentDetailSchema],
      default: [],
    },

    activePaymentIndex: {
      type: Number,
      default: 0,
    },

    // ================= STATUS =================
    status: {
      type: String,
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
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

// ================= ORDER NUMBER =================
OrderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.orderNumber = `ORD-${code}`;
  }
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
