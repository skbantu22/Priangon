"use client";

import OrderRow from "./OrderRow";

export default function OrderTable({ orders }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr className="text-left">
            <th className="p-4">Invoice</th>
            <th className="p-4">Customer</th>
            <th className="p-4">Products</th>
            <th className="p-4">Payment</th>
            <th className="p-4">Total</th>
            <th className="p-4">Status</th>
            <th className="p-4">Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <OrderRow key={order._id} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
