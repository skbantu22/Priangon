import mongoose from "mongoose";

/**
 * One line of the Activity Log: who created, changed or deleted what.
 * Written by lib/activityLog.js, never edited afterwards.
 */
const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userName: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },

    // Purchase, Sale, Expense...
    module: { type: String, required: true, index: true },
    action: { type: String, enum: ["created", "updated", "deleted"], required: true, index: true },

    docId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    // the number or name people know it by: PUR-12, EXP-4, "Samsung A15"
    label: { type: String, trim: true, default: "" },

    // { old, new } for a change, { new } for a create, { old } for a delete
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema, "activity_logs");
