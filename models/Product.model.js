import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      default: null,
    },

    brand: { type: String, trim: true, default: "", index: true },

    // =========================
    // 🛡️ WARRANTY
    // =========================
    warranty: {
      type: {
        type: String,
        enum: ["none", "official", "brand", "shop"],
        default: "none",
      },
      months: { type: Number, min: 0, default: 0 },
    },

    // simple = one item (auto "Default" variant), variant = colors / storage / sizes
    productType: { type: String, enum: ["simple", "variant"], default: "variant" },
    unit: { type: String, trim: true, default: "Pcs" },
    code: { type: String, trim: true, default: "" },
    rackNo: { type: String, trim: true, default: "" },
    weight: { type: Number, min: 0, default: 0 }, // gram

    // low-stock alert when total stock falls to this (0 = no alert)
    alertQuantity: { type: Number, min: 0, default: 0 },
    // the POS may not sell below this (0 = no limit)
    minSalePrice: { type: Number, min: 0, default: 0 },

    // Settings → VAT Settings: the POS adds the group's percent on top
    vatGroup: { type: mongoose.Schema.Types.ObjectId, ref: "VatGroup", default: null },
    // listed on the website shop
    showInWebsite: { type: Boolean, default: true },

    // phones / watches: each unit sold must carry its IMEI or serial number
    trackSerial: { type: Boolean, default: false },

    mrp: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },

    // price list per buyer type (0 = not set, the selling price is used)
    purchasePrice: { type: Number, min: 0, default: 0 },
    dealerPrice: { type: Number, min: 0, default: 0 },
    subDealerPrice: { type: Number, min: 0, default: 0 },
    wholesalerPrice: { type: Number, min: 0, default: 0 },

    discountPercentage: { type: Number, min: 0, max: 100 },

    offers: {
      type: [String],
      enum: ["mega", "new", "top", "free", "valentine"],
      default: [],
    },

    freeDelivery: { type: Boolean, default: false },

    // =========================
    // 📸 PRODUCT IMAGES
    // =========================
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },
    ],

    // =========================
    // ⭐ REVIEW SCREENSHOTS (CLOUDINARY READY)
    // =========================
    reviewScreenshots: [
      {
        url: { type: String }, // Cloudinary secure_url
        public_id: { type: String }, // Cloudinary delete reference
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // =========================
    // 🎥 PRODUCT VIDEOS (OPTIONAL)
    // =========================
    videos: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["mp4", "youtube", "url"],
          default: "url",
        },
        thumbnail: { type: String, default: null },
      },
    ],

    // a POS product needs no write-up
    description: { type: String, default: "" },

    color: { type: String },
    size: { type: String },

    sizeChart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },

    // =========================
    // VARIANTS
    // =========================
    variants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductVariant",
        },
      ],
      default: [],
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

// Indexes
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ offers: 1 });

productSchema.plugin(activityLog, { module: "Product", label: "name" });

const ProductModel =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema, "products");

export default ProductModel;
