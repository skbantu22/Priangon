import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";

const money = (amount) => `৳${Number(amount || 0).toLocaleString("en-BD")}`;

export default async function OrderSummaryPage({ searchParams }) {
  const params = await searchParams;
  const id = params?.id;

  if (!id) return notFound();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  await connectDB();

  const order = await OrderModel.findById(id).lean();

  if (!order) return notFound();

  const paymentInfo =
    Array.isArray(order?.payments) && order.payments.length > 0
      ? order.payments[order.activePaymentIndex || 0] || order.payments[0]
      : null;

  const paymentStatusText =
    paymentInfo?.status === "SUCCESS"
      ? "Successfully Paid"
      : paymentInfo?.status === "UNPAID"
      ? "Cash on Delivery"
      : paymentInfo?.status || "Pending";

  const paymentStatusClass =
    paymentInfo?.status === "SUCCESS"
      ? "text-green-600"
      : paymentInfo?.status === "UNPAID"
      ? "text-orange-600"
      : "text-gray-600";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="bg-green-600 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold">Order Confirmed!</h1>
            <p className="mt-1 opacity-90">Order #{order?.orderNumber}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 border-b border-gray-100 p-6 text-sm md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold uppercase text-gray-400">
                Shipping to
              </h3>
              <p className="font-medium text-gray-800">
                {order?.customer?.name || "N/A"}
              </p>
              <p className="text-gray-600">
                {order?.customer?.address || "N/A"}
                {order?.customer?.cityId ? `, ${order.customer.cityId}` : ""}
              </p>
              <p className="text-gray-600">
                {order?.customer?.phone || "N/A"}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold uppercase text-gray-400">
                Payment
              </h3>
              <p className="font-medium capitalize text-gray-800">
                {order?.paymentMethodSelected || "cod"}
              </p>
              <p className={`font-semibold italic ${paymentStatusClass}`}>
                {paymentStatusText}
              </p>
            </div>
          </div>

          <div className="p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Items Summary
            </h3>

            <div className="space-y-4">
              {(order?.items || []).map((item, idx) => (
                <div
                  key={`${item?.variantId || idx}-${idx}`}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-4">
                    {item?.media ? (
                      <img
                        src={item.media}
                        alt={item?.name || "Product"}
                        className="h-12 w-12 rounded border object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded border bg-gray-100" />
                    )}

                    <div>
                      <p className="font-semibold">{item?.name || "Product"}</p>
                      <p className="text-gray-500">
                        Qty: {Number(item?.quantity || 1)}
                        {item?.size ? ` • Size: ${item.size}` : ""}
                        {item?.color ? ` • ${item.color}` : ""}
                      </p>
                    </div>
                  </div>

                  <p className="font-bold text-gray-900">
                    {money(
                      Number(item?.sellingPrice || 0) *
                        Number(item?.quantity || 1)
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 bg-gray-50 p-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{money(order?.subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>{money(order?.shippingFee)}</span>
            </div>

            {Number(order?.discount || 0) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Discount</span>
                <span>- {money(order?.discount)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 text-xl font-black text-gray-900">
              <span>Total</span>
              <span>{money(order?.total)}</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-gray-900 px-10 py-3 font-semibold text-white shadow-md transition hover:bg-gray-800"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}