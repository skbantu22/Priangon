import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    asset_id: {
      type: String,
      required: true,
      trim: true,
    },

    public_id: {
      type: String,
      required: true,
      trim: true,
    },

    secure_url: {
      type: String,
      required: true,
    },

    path: {
      type: String,
    },

    thumbnail_url: {
      type: String,
    },

    title: {
      type: String,
      trim: true,
    },

    alt: {
      type: String,
      trim: true,
      default: "",
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const MediaModel =
  mongoose.models.Media || mongoose.model("Media", mediaSchema, "medias");

export default MediaModel;
