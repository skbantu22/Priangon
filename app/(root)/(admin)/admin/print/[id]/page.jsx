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
    return (
      <div className="p-6 text-center font-sans text-red-500">
        Order not found
      </div>
    );
  }

  // Convert ObjectIds and dates to strings to pass safely across the boundary
  const safeOrder = {
    ...order,
    _id: order._id.toString(),

    // 1️⃣ SOLD BY: Scans all common schema field variations to find the salesperson's name
    soldBy:
      order.sellerName ||
      order.soldBy ||
      order.cashier ||
      order.createdBy ||
      "Counter Staff",

    // 2️⃣ CUSTOMER & PHONE details mapping
    customerName: order.customerName || "Guest",
    customerPhone:
      order.customerPhone || order.phone || order.customer?.phone || "N/A",

    // 3️⃣ SALE DATE serialization tracking
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
    saleDate: order.saleDate ? new Date(order.saleDate).toISOString() : null,

    showroom:
      order.showroomId && typeof order.showroomId === "object"
        ? {
            _id: order.showroomId._id?.toString(),
            name: order.showroomId.name || "Showroom Has No Name Value",
            address:
              order.showroomId.address || "Showroom Has No Address Value",
            phone: order.showroomId.phone || "Showroom Has No Phone Value",
          }
        : {
            _id: null,
            name: "⚠️ POPULATION FAILED",
            address: `Database value is completely unpopulated: ${String(order?.showroomId || "EMPTY")}`,
            phone:
              "Make a NEW order to verify if old test orders are corrupted.",
          },

    items: (order.items || []).map((item) => ({
      ...item,
      _id: item._id?.toString?.() || "",
      productId: item.productId?.toString?.() || "",
      variantId: item.variantId?.toString?.() || "",
    })),

    payments: (order.payments || []).map((payment) => ({
      ...payment,
      _id: payment._id?.toString?.() || String(Math.random()),
    })),
  };

  delete safeOrder.showroomId;

  return <PrintReceipt order={safeOrder} />;
}
