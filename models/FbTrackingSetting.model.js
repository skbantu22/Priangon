// models/FBTrackingSetting.model.js
import mongoose from "mongoose";

const TrackingSettingsSchema = new mongoose.Schema(
  {
    meta: {
      pixelId: { type: String, default: "", trim: true },
      accessToken: { type: String, default: "", trim: true },
      testEventCode: { type: String, default: "", trim: true },
      enabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Prevent model overwrite in dev (Next.js hot reload safe)
const FBTrackingSettingsModel =
  mongoose.models.TrackingSettings ||
  mongoose.model("TrackingSettings", TrackingSettingsSchema);

export default FBTrackingSettingsModel;
