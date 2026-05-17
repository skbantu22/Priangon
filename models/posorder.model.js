import mongoose from "mongoose";

const POSOrderSchema = new mongoose.Schema(
  {
    orderNumber: String,

    // Showroom Name
    showroomId: {
      type: String, // <-- Changed from ObjectId to String
      required: true,
    },

    // User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Products
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        productName: String,

        qty: {
          type: Number,
          required: true,
        },

        price: {
          type: Number,
          required: true,
        },

        subtotal: Number,
      },
    ],

    // Order Total
    total: {
      type: Number,
      required: true,
    },

    // Payment
    paymentMethod: {
      type: String,
      default: "cash",
    },

    // Status
    status: {
      type: String,
      default: "completed",
    },

    // Order Type
    orderType: {
      type: String,
      default: "pos",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.POSOrder ||
  mongoose.model("POSOrder", POSOrderSchema);
