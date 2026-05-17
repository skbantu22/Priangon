"use client";

import { useEffect } from "react";

export default function PrintReceipt({ order }) {
  useEffect(() => {
    window.print();
  }, []);

  if (!order) return <div>Loading...</div>;

  return (
    <div
      id="receipt"
      className="w-[80mm] mx-auto p-2 font-mono text-[12px] leading-4 print:w-[80mm]"
    >
      {/* Header */}
      <h2 className="text-center font-bold text-base">My POS Shop</h2>

      <hr className="my-2 border-black" />

      <p>Order: {order.orderNumber}</p>
      <p>Total: {order.total}</p>

      <hr className="my-2 border-black" />

      {/* Items */}
      {order.items.map((item, i) => (
        <div key={i} className="flex justify-between">
          <span className="w-[60%]">{item.name}</span>
          <span className="text-right">
            {item.qty} x {item.price}
          </span>
        </div>
      ))}

      <hr className="my-2 border-black" />

      {/* Total */}
      <h3 className="text-right font-bold text-sm">Total: {order.total}</h3>

      <p className="text-center mt-2">Thank You</p>
    </div>
  );
}
