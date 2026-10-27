import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Broken units a customer brought back, kept apart from the stock that can be
 * sold. One lot is the damaged units of one sale-return row (a handset gets a
 * lot of its own, by IMEI). Each lot remembers which purchase the goods came
 * from, who sold them to us and until when that supplier stands behind them,
 * so a broken unit can go back to him (a purchase return) or be written off.
 */
const historySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["supplier_return", "write_off"], required: true },
    qty: { type: Number, required: true, min: 1 },
    ref: { type: String, default: "" }, // the purchase return number
    note: { type: String, default: "" },
    by: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { _id: false },
);

const damagedLotSchema = new mongoose.Schema(
  {
    // null = the warehouse, the one mother stock
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true, index: true },
    productName: { type: String, trim: true, default: "" },
    variantLabel: { type: String, trim: true, default: "" },
    imei: { type: String, trim: true, default: "", index: true },

    qty: { type: Number, required: true, min: 1 }, // came back broken
    left: { type: Number, required: true, min: 0 }, // still on the damaged shelf
    sentQty: { type: Number, default: 0, min: 0 }, // gone back to the supplier
    writtenOffQty: { type: Number, default: 0, min: 0 }, // written off as a loss

    // the customer's return it came in on
    // (a lot made from a warranty claim has no sale return; it points at the claim instead)
    saleReturnId: { type: mongoose.Schema.Types.ObjectId, ref: "SaleReturn", default: null, index: true },
    warrantyClaimId: { type: mongoose.Schema.Types.ObjectId, ref: "WarrantyClaim", default: null, index: true },
    returnNumber: { type: String, default: "" },
    orderNumber: { type: String, default: "" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },

    // the purchase it was bought on (null when no purchase of it is on record)
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", default: null },
    purchaseNumber: { type: String, default: "" },
    purchaseLine: { type: Number, default: 0 },
    purchaseDate: { type: Date, default: null },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null, index: true },
    supplierName: { type: String, default: "" },
    unitCost: { type: Number, default: 0, min: 0 },
    warrantyMonths: { type: Number, default: 0, min: 0 },
    warrantyUntil: { type: Date, default: null },

    history: { type: [historySchema], default: [] },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

damagedLotSchema.plugin(activityLog, { module: "Damaged Stock", label: "returnNumber" });

export default mongoose.models.DamagedLot || mongoose.model("DamagedLot", damagedLotSchema, "damaged_lots");
