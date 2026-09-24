import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    // Kept on the row so an old purchase still reads correctly
    // after the product is renamed or deleted
    productName: { type: String, trim: true, default: "" },
    variantLabel: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, default: "" },

    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    // Handset IMEIs scanned in with this row
    imeis: { type: [String], default: [] },
  },
  { _id: false },
);

const purchasePaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },

    method: {
      type: String,
      enum: ["cash", "bkash", "nagad", "bank", "cheque", "other"],
      default: "cash",
    },

    reference: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: Date.now },
    createdBy: { type: String, trim: true, default: "" },
  },
  { _id: true },
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },

    supplierName: { type: String, trim: true, default: "" },

    // The supplier's own challan / invoice number
    referenceNo: { type: String, trim: true, default: "" },

    purchaseDate: { type: Date, default: Date.now, index: true },

    items: {
      type: [purchaseItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "A purchase needs at least one item",
      },
    },

    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },

    payments: { type: [purchasePaymentSchema], default: [] },

    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
      index: true,
    },

    // Stock only moves when a pending purchase is received
    status: {
      type: String,
      enum: ["pending", "received", "cancelled"],
      default: "pending",
      index: true,
    },

    receivedAt: { type: Date, default: null },

    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Keeps totals honest no matter which route wrote the document
purchaseSchema.methods.recalculateTotals = function () {
  this.subtotal = this.items.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );

  this.grandTotal =
    this.subtotal - Number(this.discount || 0) + Number(this.shippingCost || 0);

  this.paidAmount = this.payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  this.dueAmount = this.grandTotal - this.paidAmount;

  if (this.paidAmount <= 0) {
    this.paymentStatus = "unpaid";
  } else if (this.dueAmount > 0) {
    this.paymentStatus = "partial";
  } else {
    this.paymentStatus = "paid";
  }
};

const PurchaseModel =
  mongoose.models.Purchase ||
  mongoose.model("Purchase", purchaseSchema, "purchases");

export default PurchaseModel;
