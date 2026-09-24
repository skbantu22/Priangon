import mongoose from "mongoose";

export const TICKET_STATUSES = [
  "open",
  "in-progress",
  "waiting-customer",
  "resolved",
  "closed",
];

export const TICKET_CATEGORIES = [
  "warranty",
  "delivery",
  "payment",
  "product",
  "other",
];

const ticketMessageSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true },
    author: { type: String, trim: true, default: "" },

    authorType: {
      type: String,
      enum: ["staff", "customer"],
      default: "staff",
    },

    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    customerName: { type: String, required: true, trim: true },

    // Stored normalised to 01XXXXXXXXX so a search always matches
    phone: { type: String, required: true, trim: true, index: true },

    email: { type: String, trim: true, lowercase: true, default: "" },

    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },

    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      default: "other",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "open",
      index: true,
    },

    // Ties the complaint to what was sold, so staff can look it up
    orderNumber: { type: String, trim: true, default: "", index: true },
    imei: { type: String, trim: true, default: "", index: true },

    assignedTo: { type: String, trim: true, default: "" },

    messages: { type: [ticketMessageSchema], default: [] },

    resolvedAt: { type: Date, default: null },
    createdBy: { type: String, trim: true, default: "" },

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

const SupportTicketModel =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema, "supporttickets");

export default SupportTicketModel;
