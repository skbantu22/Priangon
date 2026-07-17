import mongoose from "mongoose";

const POSOrderSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFO
    // =========================
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // =========================
    // ITEMS
    // =========================
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
          index: true,
        },

        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        productName: {
          type: String,
          required: true,
          trim: true,
        },

        image: String,
        color: String,
        size: String,

        qty: {
          type: Number,
          required: true,
          min: 1,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // =========================
    // BILL SUMMARY
    // =========================
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    vat: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================
    // CUSTOMER INFO
    // =========================
    customerName: {
      type: String,
      default: "Walk-in Customer",
      trim: true,
    },

    phone: String,
    address: String,

    saleDate: {
      type: Date,
      default: Date.now,
    },

    remark: String,
    soldBy: String,

    // =========================
    // PAYMENT SYSTEM
    // =========================
    payments: [
      {
        type: {
          type: String,
          enum: ["Cash", "Mobile Banking", "Card", "Bank"],
          required: true,
        },

        option: {
          type: String,
          default: "",
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    paymentDetails: {
      transactionId: String,
      cardDigits: String,
      bankTxnRef: String,
    },

    // =========================
    // ORDER STATUS
    // =========================
    status: {
      type: String,
      enum: ["completed", "cancelled", "refunded"],
      default: "completed",
      index: true,
    },

    orderType: {
      type: String,
      enum: ["pos", "exchange"],
      default: "pos",
      index: true,
    },

    // =========================
    // EXCHANGE SYSTEM
    // =========================
    // =========================
    // EXCHANGE SYSTEM
    // =========================
    exchange: {
      isExchange: {
        type: Boolean,
        default: false,
      },

      reason: {
        type: String,
        default: "",
      },

      originalOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "POSOrder",
      },

      // যে showroom থেকে original sale হয়েছিল
      originalShowroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Showroom",
      },

      // যে showroom থেকে exchange করা হয়েছে
      exchangeShowroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Showroom",
      },

      returnedItems: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },

          variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant",
          },

          productName: String,

          qty: Number,

          price: Number,

          subtotal: Number,
        },
      ],

      newItems: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },

          variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant",
          },

          productName: String,

          qty: Number,

          price: Number,

          subtotal: Number,
        },
      ],

      // Exchange হিসাব
      returnedTotal: {
        type: Number,
        default: 0,
      },

      newTotal: {
        type: Number,
        default: 0,
      },

      difference: {
        type: Number,
        default: 0,
      },

      refundAmount: {
        type: Number,
        default: 0,
      },

      extraPaid: {
        type: Number,
        default: 0,
      },

      exchangeDate: {
        type: Date,
        default: Date.now,
      },

      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.POSOrder ||
  mongoose.model("POSOrder", POSOrderSchema);
