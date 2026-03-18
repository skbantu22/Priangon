import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    pcImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },

    mobileImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },

    link: {
      type: String,
      trim: true,
      default: "",
    },

    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const BannerModel =
  mongoose.models.Banner ||
  mongoose.model("Banner", bannerSchema, "banners");

export default BannerModel;