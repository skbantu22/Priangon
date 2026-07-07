"use client";

export default function OrderViewModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white rounded-xl w-[700px] p-6">
        <h2 className="text-xl font-bold mb-4">{order.orderNumber}</h2>

        <p>Customer :{order.customerName}</p>

        <p>Phone :{order.phone}</p>

        <p>Total : ৳{order.total}</p>

        <hr className="my-4" />

        {order.items?.map((item) => (
          <div key={item.variantId} className="flex justify-between py-2">
            <span>{item.productName}</span>

            <span>
              {item.qty} × {item.price}
            </span>
          </div>
        ))}

        <button
          onClick={onClose}
          className="mt-5 bg-red-600 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
