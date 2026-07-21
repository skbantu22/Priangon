"use client";

export default function OrderRow({ order }) {
  console.log("FULL ORDER:", order);

  console.log("FIRST ITEM:", order.items?.[0]);

  console.log("IMAGE:", order.items?.[0]?.thumbnail);
  const isOnline = !!order.customer;

  const invoice =
    order.orderNumber || order.invoiceNumber || `#${order._id?.slice(-8)}`;

  const date = order.saleDate || order.createdAt;

  const customerName = isOnline ? order.customer?.name : order.customerName;

  const phone = isOnline ? order.customer?.phone : order.phone;

  const soldBy = order.soldBy || "Online";

  return (
    <tr className="border-b hover:bg-gray-50 align-top">
      {/* Invoice */}
      <td className="p-4">
        <h3 className="font-semibold">{invoice}</h3>

        <p className="text-xs text-gray-500">
          {date ? new Date(date).toLocaleDateString() : "-"}
        </p>

        <p className="text-xs text-gray-500 mt-1">{soldBy}</p>
      </td>

      {/* Customer */}
      <td className="p-4">
        <h4 className="font-medium">{customerName || "Walk In Customer"}</h4>

        <p className="text-sm text-gray-500">{phone || "No Phone"}</p>
      </td>

      {/* Products */}
      <td className="p-4">
        <div className="space-y-3">
          {order.items?.map((item, index) => (
            <div key={item._id || index} className="flex gap-3">
              <img
                src={
                  item.thumbnail ||
                  item.image ||
                  item.productImage ||
                  "/placeholder.png"
                }
                alt={item.productName || "Product"}
                className="w-16 h-16 rounded-lg border object-cover"
              />

              <div>
                <h4 className="font-medium">
                  {item.productName ||
                    item.name ||
                    item.productId?.name ||
                    "Product"}
                </h4>

                {item.color && (
                  <p className="text-sm text-gray-500">{item.color}</p>
                )}

                {item.size && (
                  <p className="text-sm text-gray-500">{item.size}</p>
                )}

                <p className="text-sm">
                  Qty : {item.qty || item.quantity || 1}
                </p>
              </div>
            </div>
          ))}
        </div>
      </td>

      {/* Payment */}
      <td className="p-4">
        <p className="capitalize">{order.paymentMethod || "-"}</p>

        {order.payments?.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">{order.payments[0].type}</p>
        )}
      </td>

      {/* Total */}
      <td className="p-4">
        <h3 className="font-bold text-lg">৳ {order.total || 0}</h3>

        <p className="text-xs text-gray-500">
          Discount : {order.discount || 0}
        </p>

        <p className="text-xs text-gray-500">VAT : {order.vat || 0}</p>
      </td>

      {/* Status */}
      <td className="p-4">
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            order.status === "approved" || order.status === "completed"
              ? "bg-green-100 text-green-700"
              : order.status === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {order.status}
        </span>
      </td>

      {/* Action */}
      <td className="p-4">
        <div className="flex flex-col gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded">
            View
          </button>

          <button className="bg-gray-700 text-white px-3 py-1 rounded">
            Print
          </button>

          <button className="bg-orange-500 text-white px-3 py-1 rounded">
            Exchange
          </button>
        </div>
      </td>
    </tr>
  );
}
