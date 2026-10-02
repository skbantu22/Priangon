import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * A market, bazar or thana a supplier or customer sells in.
 *
 * Kept as a list rather than typed free-hand so "Mirpur 10", "mirpur-10"
 * and "Mirpur10" do not become three different areas in a report. Each
 * shop keeps its own list.
 */
const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Area name is required"],
      trim: true,
    },

    // Null is the warehouse, the way suppliers and stock are kept
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      default: null,
      index: true,
    },

    note: { type: String, trim: true, default: "" },

    isActive: { type: Boolean, default: true, index: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

areaSchema.index({ name: 1, showroomId: 1 }, { unique: true });

areaSchema.plugin(activityLog, { module: "Area", label: "name" });

export default mongoose.models.Area || mongoose.model("Area", areaSchema);
