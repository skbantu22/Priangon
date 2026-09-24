// Loads a POS invoice and shapes it into the plain object PrintReceipt expects.
// Shared by the admin print page and the partner portal invoice page.

import mongoose from "mongoose";
import POSOrder from "@/models/posorder.model";
import Showroom from "@/models/Showroom.model";
import { connectDB } from "@/lib/databaseconnection";
import { getSettings } from "@/models/Setting.model";

// filter: extra conditions, e.g. { customerId } so partners only see their own
export async function loadPrintableOrder(id, filter = {}) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();

  const order = await POSOrder.findOne({ _id: id, ...filter })
    .populate({
      path: "showroomId",
      model: Showroom,
    })
    .lean()
    .exec();

  if (!order) return null;

  // ✅ Convert EVERYTHING into plain JSON
  const safeOrder = JSON.parse(JSON.stringify(order));

  // Basic fields
  safeOrder._id = safeOrder._id?.toString();

  safeOrder.soldBy =
    safeOrder.sellerName ||
    safeOrder.soldBy ||
    safeOrder.cashier ||
    safeOrder.createdBy ||
    "Counter Staff";

  safeOrder.customerName = safeOrder.customerName || "Guest";

  safeOrder.customerPhone =
    safeOrder.customerPhone ||
    safeOrder.phone ||
    safeOrder.customer?.phone ||
    "N/A";

  safeOrder.createdAt = safeOrder.createdAt
    ? new Date(safeOrder.createdAt).toISOString()
    : null;

  safeOrder.saleDate = safeOrder.saleDate
    ? new Date(safeOrder.saleDate).toISOString()
    : null;

  // Showroom
  safeOrder.showroom =
    safeOrder.showroomId && typeof safeOrder.showroomId === "object"
      ? {
          _id: safeOrder.showroomId._id?.toString?.() || "",
          name: safeOrder.showroomId.name || "",
          address: safeOrder.showroomId.address || "",
          phone: safeOrder.showroomId.phone || "",
          email: safeOrder.showroomId.email || "",
        }
      : null;

  delete safeOrder.showroomId;

  // The header, NBR identifiers and terms printed on the invoice come
  // from App Settings, so they are set once instead of living in the
  // receipt component
  const settings = await getSettings();

  safeOrder.company = {
    name: settings.companyName || "",
    address: settings.address || "",
    phone: settings.phone || "",
    email: settings.email || "",
    bin: settings.bin || "",
    tradeLicenseNo: settings.tradeLicenseNo || "",
    vatEnabled: !!settings.vatEnabled,
    vatRate: Number(settings.vatRate) || 0,
    mushakFormNo: settings.mushakFormNo || "",
    showMushakLine: !!settings.showMushakLine,
    invoiceFooter: settings.invoiceFooter || "",
    warrantyTerms: settings.warrantyTerms || "",
    showAmountInWords: settings.showAmountInWords !== false,
  };

  // Items
  safeOrder.items = (safeOrder.items || []).map((item) => ({
    ...item,
    _id: item._id?.toString?.() || "",
    productId: item.productId?.toString?.() || "",
    variantId: item.variantId?.toString?.() || "",
  }));

  // Payments
  safeOrder.payments = (safeOrder.payments || []).map((payment) => ({
    ...payment,
    _id: payment._id?.toString?.() || "",
  }));

  // Exchange
  if (safeOrder.exchange) {
    safeOrder.exchange = {
      ...safeOrder.exchange,

      originalOrderId: safeOrder.exchange.originalOrderId?.toString?.() || "",

      processedBy: safeOrder.exchange.processedBy?.toString?.() || "",

      exchangeDate: safeOrder.exchange.exchangeDate
        ? new Date(safeOrder.exchange.exchangeDate).toISOString()
        : null,

      returnedItems: (safeOrder.exchange.returnedItems || []).map((item) => ({
        ...item,
        productId: item.productId?.toString?.() || "",
        variantId: item.variantId?.toString?.() || "",
      })),

      newItems: (safeOrder.exchange.newItems || []).map((item) => ({
        ...item,
        productId: item.productId?.toString?.() || "",
        variantId: item.variantId?.toString?.() || "",
      })),
    };
  }

  return safeOrder;
}
