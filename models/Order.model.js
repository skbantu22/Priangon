import mongoose from "mongoose";
import crypto from "crypto";
// This forces Mongoose to clear the cached "Order" model
// and re-read your new Order.model.js file.

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

      required: false,
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

const PaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["cod"],
      required: true,
    },

    merchantInvoiceNumber: { type: String, default: "", index: true },
    paymentId: { type: String, default: "" },
    trxId: { type: String, default: "" },
    valId: { type: String, default: "" },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "BDT" },
    rawResponse: { type: Object, default: {} },
    initiatedAt: { type: Date, default: Date.now },
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
    orderNumber: { type: String, unique: true, index: true },

    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      cityId: { type: String, default: "" },
    },

    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "BDT" },

    coupon: {
      code: { type: String, default: "" },
      discountPercentage: { type: Number, default: 0 },
    },

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

    paymentMethodSelected: {
      type: String,
      enum: ["cod"],
      default: "cod",
      index: true,
    },

    payments: { type: [PaymentSchema], default: [] },
    activePaymentIndex: { type: Number, default: 0 },
  },
  { timestamps: true },
);

OrderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.orderNumber = `ORD-${code}`;
  }
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
