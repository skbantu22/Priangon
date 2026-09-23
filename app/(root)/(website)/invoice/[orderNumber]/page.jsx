import POSOrder from "@/models/posorder.model";

import Showroom from "@/models/Showroom.model";

import { connectDB } from "@/lib/databaseconnection";

import PrintReceipt from "@/components/PrintReceipt";

import { isValidInvoiceToken } from "@/lib/invoiceLink";

const notFound = (
  <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
    Invoice Not Found
  </div>
);

export default async function Page({ params, searchParams }) {
  const { orderNumber } = await params;
  const { t } = await searchParams;

  // only the signed link sent to the customer opens an invoice
  if (!isValidInvoiceToken(orderNumber, t)) return notFound;

  await connectDB();

  const order = await POSOrder.findOne({ orderNumber })

    .populate({
      path: "showroomId",

      model: Showroom,
    })

    .lean();

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
        Invoice Not Found
      </div>
    );
  }

  // Convert to plain object

  const safeOrder = JSON.parse(JSON.stringify(order));

  safeOrder._id = safeOrder._id?.toString();

  safeOrder.soldBy =
    safeOrder.sellerName ||
    safeOrder.soldBy ||
    safeOrder.cashier ||
    safeOrder.createdBy ||
    "Counter Staff";

  safeOrder.customerName = safeOrder.customerName || "Guest";

  safeOrder.customerPhone = safeOrder.customerPhone || safeOrder.phone || "N/A";

  safeOrder.createdAt = safeOrder.createdAt
    ? new Date(safeOrder.createdAt).toISOString()
    : null;

  safeOrder.saleDate = safeOrder.saleDate
    ? new Date(safeOrder.saleDate).toISOString()
    : null;

  safeOrder.showroom =
    safeOrder.showroomId && typeof safeOrder.showroomId === "object"
      ? {
          _id: safeOrder.showroomId._id?.toString() || "",

          name: safeOrder.showroomId.name || "",

          address: safeOrder.showroomId.address || "",

          phone: safeOrder.showroomId.phone || "",

          email: safeOrder.showroomId.email || "",
        }
      : null;

  delete safeOrder.showroomId;

  safeOrder.items = (safeOrder.items || []).map((item) => ({
    ...item,

    _id: item._id?.toString() || "",

    productId: item.productId?.toString() || "",

    variantId: item.variantId?.toString() || "",
  }));

  safeOrder.payments = (safeOrder.payments || []).map((payment) => ({
    ...payment,

    _id: payment._id?.toString() || "",
  }));

  if (safeOrder.exchange) {
    safeOrder.exchange = {
      ...safeOrder.exchange,

      originalOrderId: safeOrder.exchange.originalOrderId?.toString() || "",

      processedBy: safeOrder.exchange.processedBy?.toString() || "",

      exchangeDate: safeOrder.exchange.exchangeDate
        ? new Date(safeOrder.exchange.exchangeDate).toISOString()
        : null,

      returnedItems: (safeOrder.exchange.returnedItems || []).map((item) => ({
        ...item,

        productId: item.productId?.toString() || "",

        variantId: item.variantId?.toString() || "",
      })),

      newItems: (safeOrder.exchange.newItems || []).map((item) => ({
        ...item,

        productId: item.productId?.toString() || "",

        variantId: item.variantId?.toString() || "",
      })),
    };
  }

  return <PrintReceipt order={safeOrder} publicView />;
}
