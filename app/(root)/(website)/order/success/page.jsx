import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import PurchaseTracker from "@/components/ui/Application/website/PurchaseTracker";

const money = (amount) => `৳${Number(amount || 0).toLocaleString("en-BD")}`;

export default async function OrderSummaryPage({ searchParams }) {
  const params = await searchParams;
  const id = params?.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) return notFound();

  await connectDB();

  // Fetch and convert to plain object to avoid serialization issues
  const rawOrder = await OrderModel.findById(id).lean();
  if (!rawOrder) return notFound();

  // Ensure the object is fully serializable for Client Components
  const order = JSON.parse(JSON.stringify(rawOrder));

  const payment = order.payments?.[0];
  const isPaid = payment?.status?.toUpperCase() === "SUCCESS";
  const statusText = isPaid ? "Successfully Paid" : "Cash on Delivery";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <PurchaseTracker order={order} />

      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Header */}
          <div className="bg-green-600 p-8 text-center text-white">
            <h1 className="text-2xl font-bold">Order Confirmed!</h1>
            <p className="mt-1 font-mono opacity-90">
              Order #
              {order.orderNumber ||
                order._id.toString().toUpperCase().slice(-8)}
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 p-6 text-sm">
            <div>
              <h3 className="mb-2 font-semibold uppercase text-gray-400">
                Shipping to
              </h3>
              <p className="font-bold text-gray-800">{order.customer?.name}</p>
              <p className="text-gray-600">
                {order.customer?.address}, {order.customer?.cityId}
              </p>
              <p className="text-gray-600">{order.customer?.phone}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold uppercase text-gray-400">
                Payment
              </h3>
              <p className="font-medium capitalize text-gray-800">
                {order.paymentMethodSelected?.replace(/_/g, " ")}
              </p>
              <p
                className={`font-bold italic ${isPaid ? "text-green-600" : "text-orange-600"}`}
              >
                {statusText}
              </p>
            </div>
          </div>

          {/* Items Summary */}
          <div className="p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Items Summary
            </h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {item.media ? (
                        <img
                          src={item.media}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                        {item.size && ` • Size: ${item.size}`}
                        {item.color && ` • ${item.color}`}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">
                    {money(item.sellingPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 bg-gray-50 p-6">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Shipping</span>
              <span>{money(order.shippingFee)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-red-500 text-sm">
                <span>Discount</span>
                <span>-{money(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-xl font-black text-gray-900">
              <span>Total Paid</span>
              <span>{money(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-gray-900 px-10 py-3 font-bold text-white shadow-lg transition hover:bg-black active:scale-95"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
