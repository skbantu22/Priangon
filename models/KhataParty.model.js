import mongoose from "mongoose";

// Telekhata: what the shop keeps about one party in one book, the payment date they promised
const khataPartySchema = new mongoose.Schema(
  {
    partyType: { type: String, enum: ["customer", "supplier", "employee"], required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    showroomId: { type: String, default: "warehouse" },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

khataPartySchema.index({ partyType: 1, partyId: 1, showroomId: 1 }, { unique: true });

export default mongoose.models.KhataParty ||
  mongoose.model("KhataParty", khataPartySchema, "khataparties");
