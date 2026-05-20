import mongoose from "mongoose";

const showroomVariantAssignmentSchema = new mongoose.Schema(
  {
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// prevent duplicate assignment
showroomVariantAssignmentSchema.index(
  { showroomId: 1, variantId: 1 },
  { unique: true },
);

export default mongoose.models.ShowroomVariantAssignment ||
  mongoose.model("ShowroomVariantAssignment", showroomVariantAssignmentSchema);
