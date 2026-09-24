import mongoose from "mongoose";

/**
 * One settings document for the whole shop, found by `key`.
 * Defaults follow Bangladesh practice: 15% VAT (Mushak), taka, lakh/crore
 * grouping, a July–June fiscal year and a Friday–Saturday weekend.
 */
const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "general",
      unique: true,
      index: true,
    },

    // =========================
    // COMPANY (printed on every invoice and challan)
    // =========================
    companyName: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    website: { type: String, trim: true, default: "" },

    // NBR identifiers — BIN is 13 digits, e-TIN is 12
    bin: { type: String, trim: true, default: "" },
    tin: { type: String, trim: true, default: "" },
    tradeLicenseNo: { type: String, trim: true, default: "" },

    // =========================
    // VAT (MUSHAK)
    // =========================
    vatEnabled: { type: Boolean, default: false },

    vatRate: { type: Number, min: 0, max: 100, default: 15 },

    // true when the shelf price already contains VAT, which is the
    // usual case for retail in Bangladesh
    vatInclusive: { type: Boolean, default: true },

    // Mushak 6.3 is the VAT challan retailers issue
    mushakFormNo: { type: String, trim: true, default: "6.3" },
    showMushakLine: { type: Boolean, default: false },

    // =========================
    // INVOICE
    // =========================
    invoiceFooter: { type: String, trim: true, default: "" },
    showAmountInWords: { type: Boolean, default: true },
    warrantyTerms: { type: String, trim: true, default: "" },

    // =========================
    // REGIONAL
    // =========================
    // "latin" prints 1,23,456 and "bengali" prints ১,২৩,৪৫৬
    numberDigits: {
      type: String,
      enum: ["latin", "bengali"],
      default: "latin",
    },

    // Bangladesh's fiscal year runs July to June
    fiscalYearStartMonth: { type: Number, min: 1, max: 12, default: 7 },

    // 0 = Sunday … 5 = Friday, 6 = Saturday
    weekendDays: { type: [Number], default: [5, 6] },

    // =========================
    // STOCK
    // =========================
    lowStockAlert: { type: Number, min: 0, default: 5 },
    allowNegativeStock: { type: Boolean, default: false },

    // Require a valid 15 digit IMEI on handsets that track serials
    enforceImeiCheck: { type: Boolean, default: true },

    // =========================
    // SUPPORT / SYSTEM
    // =========================
    supportPhone: { type: String, trim: true, default: "" },
    supportEmail: { type: String, trim: true, lowercase: true, default: "" },

    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, trim: true, default: "" },

    updatedBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const SettingModel =
  mongoose.models.Setting ||
  mongoose.model("Setting", settingSchema, "settings");

/** Always returns a document, creating the defaults on first use */
export const getSettings = async () => {
  const existing = await SettingModel.findOne({ key: "general" });

  if (existing) return existing;

  return SettingModel.create({ key: "general" });
};

export default SettingModel;
