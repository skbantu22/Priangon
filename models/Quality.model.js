import mongoose from "mongoose";

// Quality / grade of an item (Original, Copy, Master...). Every showroom keeps its own list.
const qualitySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Quality name is required"], trim: true },

    // "warehouse" or a showroom id. Same convention as Brand.
    showroomId: { type: String, default: "warehouse", index: true },

    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

qualitySchema.index({ name: 1, showroomId: 1 }, { unique: true });

const QualityModel =
  mongoose.models.Quality || mongoose.model("Quality", qualitySchema, "qualities");

export default QualityModel;
