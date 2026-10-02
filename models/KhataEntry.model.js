import mongoose from "mongoose";

// Telekhata: one line of a party's credit book.
// "give" (Dichhi) = the shop gave money or goods on credit, so the party owes more (Pabo).
// "take" (Nichhi) = the shop took money or goods, so the party owes less (Dibo when it goes below 0).
const khataEntrySchema = new mongoose.Schema(
  {
    partyType: { type: String, enum: ["customer", "supplier", "employee"], required: true, index: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    direction: { type: String, enum: ["give", "take"], required: true },
    kind: { type: String, enum: ["money", "goods"], default: "money" },

    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, default: "" },
    photo: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now, index: true },

    // showroom (or "warehouse") whose book this line belongs to
    showroomId: { type: String, default: "warehouse", index: true },

    createdBy: { type: String, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

khataEntrySchema.index({ partyType: 1, partyId: 1, showroomId: 1, date: 1 });

export default mongoose.models.KhataEntry ||
  mongoose.model("KhataEntry", khataEntrySchema, "khataentries");
