import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * A request sent to a supplier. Nothing moves in stock or in the supplier's
 * balance until it is received, which turns it into a Purchase.
 */
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    productName: { type: String, trim: true, default: "" },
    variantLabel: { type: String, trim: true, default: "" },
    barcode: { type: String, trim: true, default: "" },

    // what the stock and prices were when the order was written
    stockAtOrder: { type: Number, default: 0 },
    prevPurchasePrice: { type: Number, default: 0 },
    prevSellingPrice: { type: Number, default: 0 },
    prevDealerPrice: { type: Number, default: 0 },
    prevSubDealerPrice: { type: Number, default: 0 },
    prevWholesalerPrice: { type: Number, default: 0 },

    purchasePrice: { type: Number, required: true, min: 0 },
    // the new sale rates the goods should carry, one per kind of buyer;
    // applied when the order is received. 0 = keep the current rate
    sellingPrice: { type: Number, default: 0, min: 0 },
    dealerPrice: { type: Number, default: 0, min: 0 },
    subDealerPrice: { type: Number, default: 0, min: 0 },
    wholesalerPrice: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    extraQty: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    supplierName: { type: String, trim: true, default: "" },
    reference: { type: String, trim: true, default: "" },
    orderDate: { type: Date, default: Date.now, index: true },
    deliveryDate: { type: Date, default: null },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length > 0, message: "An order needs at least one item" },
    },
    total: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["pending", "received", "cancelled"], default: "pending", index: true },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", default: null },
    purchaseNumber: { type: String, default: "" },
    attachment: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

purchaseOrderSchema.plugin(activityLog, { module: "Purchase Order", label: "orderNumber" });

export default mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", purchaseOrderSchema, "purchase_orders");
