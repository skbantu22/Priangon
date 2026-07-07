"use client";

export default function OrderRow({ order }) {
  return (
    <tr className="border-b hover:bg-gray-50 align-top">
      {/* Invoice */}
      <td className="p-4">
        <h3 className="font-semibold">{order.orderNumber}</h3>

        <p className="text-xs text-gray-500">
          {new Date(order.saleDate).toLocaleDateString()}
        </p>

        <p className="text-xs text-gray-500 mt-1">{order.soldBy}</p>
      </td>

      {/* Customer */}
      <td className="p-4">
        <h4 className="font-medium">{order.customerName}</h4>

        <p className="text-sm text-gray-500">{order.phone || "No Phone"}</p>
      </td>

      {/* Products */}
      <td className="p-4">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item._id} className="flex gap-3">
              <img
                src={item.image}
                className="w-16 h-16 rounded-lg border object-cover"
              />

              <div>
                <h4 className="font-medium">{item.productName}</h4>

                <p className="text-sm text-gray-500">{item.color}</p>

                <p className="text-sm text-gray-500">{item.size}</p>

                <p className="text-sm">Qty : {item.qty}</p>
              </div>
            </div>
          ))}
        </div>
      </td>

      {/* Payment */}
      <td className="p-4">
        <p className="capitalize">{order.paymentMethod}</p>

        <p className="text-xs text-gray-500 mt-1">
          {order.payments?.[0]?.type}
        </p>
      </td>

      {/* Total */}
      <td className="p-4">
        <h3 className="font-bold text-lg">৳ {order.total}</h3>

        <p className="text-xs text-gray-500">Discount : {order.discount}</p>

        <p className="text-xs text-gray-500">VAT : {order.vat}</p>
      </td>

      {/* Status */}
      <td className="p-4">
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
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
