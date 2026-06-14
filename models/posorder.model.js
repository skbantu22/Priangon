import mongoose from "mongoose";

const POSOrderSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFO
    // =========================
    orderNumber: {
      type: String,
      required: true,
    },

    showroomId: {
      type: String,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =========================
    // ITEMS (ORIGINAL SALE)
    // =========================
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        variantId: {
          type: mongoose.Schema.Types.ObjectId,
        },

        productName: {
          type: String,
          required: true,
        },

        image: String,
        color: String,
        size: String,

        qty: {
          type: Number,
          required: true,
        },

        price: {
          type: Number,
          required: true,
        },

        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],

    // =========================
    // BILL SUMMARY
    // =========================
    subTotal: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    vat: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
    },

    // =========================
    // CUSTOMER INFO
    // =========================
    customerName: String,
    phone: String,
    address: String,

    saleDate: {
      type: Date,
      default: Date.now,
    },

    remark: String,

    soldBy: String,

    // =========================
    // PAYMENT INFO
    // =========================
    paymentMethod: {
      type: String,
      default: "cash",
    },

    payments: [
      {
        type: {
          type: String, // Cash / bKash / Card / Bank
        },
        option: String, // transaction id / reference
        amount: Number,
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
    },

    orderType: {
      type: String,
      default: "pos",
    },

    // =========================
    // 🔥 EXCHANGE SYSTEM (REAL POS)
    // =========================
    exchange: {
      isExchange: {
        type: Boolean,
        default: false,
      },

      reason: String,

      originalOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "POSOrder",
      },

      returnedItems: [
        {
          productId: mongoose.Schema.Types.ObjectId,
          variantId: mongoose.Schema.Types.ObjectId,
          productName: String,
          qty: Number,
          price: Number,
          subtotal: Number,
        },
      ],

      newItems: [
        {
          productId: mongoose.Schema.Types.ObjectId,
          variantId: mongoose.Schema.Types.ObjectId,
          productName: String,
          qty: Number,
          price: Number,
          subtotal: Number,
        },
      ],

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
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.POSOrder ||
  mongoose.model("POSOrder", POSOrderSchema);
