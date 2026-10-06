import mongoose from "mongoose";

// A phone brought in for repair (not a warranty claim on something we sold)
export const REPAIR_STATUSES = [
  "received", // taken in at the counter
  "in_progress", // the technician is working on it
  "waiting_parts",
  "repaired", // fixed, waiting for the customer
  "delivered", // handed back
  "cancelled", // customer took it back / could not be fixed
];

const partSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const repairJobSchema = new mongoose.Schema(
  {
    jobNumber: { type: String, required: true, unique: true, trim: true },

    // the repair unit's own shop; every shop keeps its own jobs
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null, index: true },

    customerName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, default: "", index: true },

    device: { type: String, trim: true, required: true }, // brand + model
    imei: { type: String, trim: true, default: "" },
    issue: { type: String, trim: true, required: true },
    accessories: { type: String, trim: true, default: "" }, // what came with it
    note: { type: String, trim: true, default: "" },

    status: { type: String, enum: REPAIR_STATUSES, default: "received", index: true },

    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    technicianName: { type: String, trim: true, default: "" },

    estimate: { type: Number, default: 0, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    // parts only carry a price; they are not taken out of stock
    parts: { type: [partSchema], default: [] },
    total: { type: Number, default: 0, min: 0 }, // service charge + parts
    paid: { type: Number, default: 0, min: 0 }, // advance + whatever was paid since
    due: { type: Number, default: 0, min: 0 }, // total - paid

    receivedAt: { type: Date, default: Date.now },
    expectedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    receivedBy: { type: String, trim: true, default: "" },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.RepairJob ||
  mongoose.model("RepairJob", repairJobSchema, "repairjobs");
