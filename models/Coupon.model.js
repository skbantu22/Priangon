import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    discountPercentage: {
      type: Number,
      required: true,
    },

    minShoppingAmount: {
      type: Number,
      required: true,
    },

    validity: {
      type: Date,
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const CouponModel =
  mongoose.models.Coupon ||
  mongoose.model("Coupon", couponSchema, "coupons");

export default CouponModel;