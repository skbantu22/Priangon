// app/(root)/(admin)/admin/print/[id]/page.jsx

import POSOrder from "@/models/posorder.model";
import Showroom from "@/models/Showroom.model";
import { connectDB } from "@/lib/databaseconnection";
import PrintReceipt from "@/components/PrintReceipt";

export default async function Page({ params }) {
  await connectDB();

  const { id } = await params;

  const order = await POSOrder.findById(id)
    .populate({
      path: "showroomId",
      model: Showroom,
    })
    .lean()
    .exec();

  if (!order) {
    return <div className="p-6 text-center text-red-500">Order not found</div>;
  }

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

  return <PrintReceipt order={safeOrder} />;
}
