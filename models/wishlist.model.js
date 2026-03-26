import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true },
);

// ✅ prevent duplicate
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

// 🔥 normalize id (optional but recommended)
wishlistSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.models.Wishlist ||
  mongoose.model("Wishlist", wishlistSchema);
