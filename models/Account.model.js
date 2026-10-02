import mongoose from "mongoose";

// AmarSolution style money accounts: Cash, Mobile Banking (bKash / Nagad...), Card,
// Bank Account, Advance and Bank Cheque. Every shop keeps its own accounts.
export const ACCOUNT_TYPES = {
  cash: "Cash",
  mobile_banking: "Mobile Banking",
  card: "Card",
  bank: "Bank Account",
  advance: "Advance",
  cheque: "Bank Cheque",
};

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.keys(ACCOUNT_TYPES), required: true, index: true },

    // bank / card / cheque accounts
    bankName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },

    openingBalance: { type: Number, default: 0 },
    openingDate: { type: Date, default: null },

    // the shop that owns it; null is the warehouse (same rule as products and suppliers)
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null, index: true },

    isActive: { type: Boolean, default: true },
    note: { type: String, trim: true, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.Account || mongoose.model("Account", accountSchema, "accounts");
