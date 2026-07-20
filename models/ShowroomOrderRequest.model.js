import mongoose from "mongoose";

const ShowroomOrderRequestSchema = new mongoose.Schema(
  {
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==========================
    // CUSTOMER
    // ==========================
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      note: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // ==========================
    // ORDER ITEMS
    // ==========================
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductVariant",
          required: true,
        },

        productName: {
          type: String,
          default: "",
        },

        color: {
          type: String,
          default: "",
        },

        size: {
          type: String,
          default: "",
        },

        qty: {
          type: Number,
          default: 1,
        },

        price: {
          type: Number,
          default: 0,
        },

        subtotal: {
          type: Number,
          default: 0,
        },

        thumbnail: {
          type: String,
          default: "",
        },
      },
    ],

    // ==========================
    // PRICE
    // ==========================
    subtotal: {
      type: Number,
      default: 0,
    },

    shippingMethod: {
      type: String,
      enum: ["inside_dhaka", "outside_dhaka"],
      default: "inside_dhaka",
    },

    shippingFee: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    // ==========================
    // PAYMENT
    // ==========================
    paymentMethod: {
      type: String,
      default: "cod",
    },

    transactionNumber: {
      type: String,
      default: "",
    },

    paymentProof: {
      type: String,
      default: "",
    },

    // ==========================
    // STATUS
    // ==========================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.ShowroomOrderRequest ||
  mongoose.model("ShowroomOrderRequest", ShowroomOrderRequestSchema);
