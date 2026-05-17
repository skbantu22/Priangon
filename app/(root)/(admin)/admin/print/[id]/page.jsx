import POSOrder from "@/models/posorder.model";
import { connectDB } from "@/lib/databaseconnection";
import PrintReceipt from "@/components/PrintReceipt";

export default async function Page({ params }) {
  await connectDB();

  const { id } = await params;

  const order = await POSOrder.findById(id)
    .lean() // ✅ IMPORTANT
    .exec();

  if (!order) {
    return <div>Order not found</div>;
  }

  // 🔥 convert ObjectId → string (IMPORTANT FIX)
  const safeOrder = {
    ...order,
    _id: order._id.toString(),
    items: order.items.map((item) => ({
      ...item,
      _id: item._id?.toString?.(),
      productId: item.productId?.toString?.(),
      variantId: item.variantId?.toString?.(),
    })),
  };

  return <PrintReceipt order={safeOrder} />;
}
