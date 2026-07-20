"use client";

import Image from "next/image";

export default function OrderDetailsModal({
  open,
  order,
  onClose,
  onApprove,
  onReject,
  approving = false,
}) {
  if (!open || !order) return null;

  const totalQty =
    order.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              Order #{order._id.slice(-8).toUpperCase()}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-3xl font-bold text-gray-500 hover:text-red-600"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
          {/* Top Info */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="border rounded-xl p-5">
              <h3 className="font-bold text-lg mb-4">Showroom</h3>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Name :</span>{" "}
                  {order.showroomId?.name ||
                    order.showroom?.name ||
                    order.showroomId}
                </p>

                <p>
                  <span className="font-semibold">Status :</span>{" "}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : order.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="border rounded-xl p-5">
              <h3 className="font-bold text-lg mb-4">Customer</h3>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Name :</span>{" "}
                  {order.customer?.name}
                </p>

                <p>
                  <span className="font-semibold">Phone :</span>{" "}
                  {order.customer?.phone}
                </p>

                <p>
                  <span className="font-semibold">Address :</span>{" "}
                  {order.customer?.address}
                </p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold text-lg mb-4">Products</h3>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Image</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">Color</th>
                    <th className="p-3 text-left">Size</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {order.items?.map((item) => {
                    const image =
                      item.variantId?.media?.[0]?.secure_url ||
                      item.productId?.media?.[0]?.secure_url ||
                      "/placeholder.png";

                    return (
                      <tr key={item._id} className="border-t">
                        <td className="p-3">
                          <div className="relative w-14 h-16 rounded overflow-hidden border">
                            <Image
                              src={image}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        </td>

                        <td className="p-3 font-semibold">
                          {item.productId?.name ||
                            item.product?.name ||
                            item.productId}
                        </td>

                        <td className="p-3">{item.color}</td>

                        <td className="p-3">{item.size}</td>

                        <td className="p-3 text-center font-bold">
                          {item.qty}
                        </td>

                        <td className="p-3 text-right">৳ {item.price}</td>

                        <td className="p-3 text-right font-bold">
                          ৳ {item.price * item.qty}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}

          <div className="border rounded-xl p-5 bg-gray-50">
            <div className="flex justify-between py-2">
              <span>Total Quantity</span>

              <span className="font-bold">{totalQty}</span>
            </div>

            <div className="flex justify-between py-2 text-xl font-bold border-t mt-2 pt-3">
              <span>Total</span>

              <span>৳ {order.total}</span>
            </div>
          </div>
        </div>

        {/* Footer */}

        <div className="border-t px-6 py-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-lg border">
            Close
          </button>

          {order.status === "pending" && (
            <>
              <button
                onClick={() => onReject(order)}
                className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Reject
              </button>

              <button
                disabled={approving}
                onClick={() => onApprove(order)}
                className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approving ? "Approving..." : "Approve"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
