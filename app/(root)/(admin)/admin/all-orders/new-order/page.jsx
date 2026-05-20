"use client";

import React, { useState } from "react";
import { Eye, X, User, Phone, MapPin, FileText } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const breadcrumbData = [
  { href: "#", label: "Home" },
  { href: "#", label: "Orders (Demo WooCommerce Style)" },
];

// ---------------- DUMMY ORDERS ----------------
const initialOrders = [
  {
    _id: "1",
    orderNumber: "ORD-1001",
    status: "pending",
    customerName: "Rahim Uddin",
    phone: "01700000000",
    address: "Dhaka, Bangladesh",
    totalAmount: 1500,
    note: "Please deliver in morning",
    items: [
      { name: "T-Shirt", qty: 2 },
      { name: "Pant", qty: 1 },
    ],
  },
  {
    _id: "2",
    orderNumber: "ORD-1002",
    status: "processing",
    customerName: "Karim Mia",
    phone: "01800000000",
    address: "Khulna, Bangladesh",
    totalAmount: 3200,
    note: "Call before delivery",
    items: [{ name: "Shoes", qty: 1 }],
  },
];

// ---------------- STATUS COLOR ----------------
const statusColor = (status) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "processing":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function OrdersShopDemo() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ---------------- UPDATE STATUS ----------------
  const updateStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
  };

  return (
    <div className="space-y-5">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">
            WooCommerce Style Orders (Demo)
          </h2>
        </CardHeader>

        <CardContent>
          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="border rounded-lg p-4 shadow-sm bg-white"
              >
                {/* TOP */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Order</p>
                    <h3 className="font-bold">#{order.orderNumber}</h3>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full ${statusColor(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* CUSTOMER */}
                <div className="mt-3 space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <User size={14} /> {order.customerName}
                  </p>

                  <p className="flex items-center gap-2">
                    <Phone size={14} /> {order.phone}
                  </p>

                  <p className="flex items-center gap-2">
                    <MapPin size={14} /> {order.address}
                  </p>

                  <p className="font-semibold">
                    Total: {order.totalAmount} BDT
                  </p>
                </div>

                {/* STATUS UPDATE */}
                <div className="mt-3">
                  <select
                    className="w-full border rounded p-1 text-sm"
                    value={order.status}
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye size={14} /> View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- MODAL ---------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg p-5 relative">
            {/* CLOSE */}
            <button
              className="absolute right-3 top-3"
              onClick={() => setSelectedOrder(null)}
            >
              <X />
            </button>

            {/* TITLE */}
            <h2 className="text-xl font-bold">
              Order #{selectedOrder.orderNumber}
            </h2>

            {/* CUSTOMER INFO */}
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <b>Name:</b> {selectedOrder.customerName}
              </p>
              <p>
                <b>Phone:</b> {selectedOrder.phone}
              </p>
              <p>
                <b>Address:</b> {selectedOrder.address}
              </p>
              <p>
                <b>Total:</b> {selectedOrder.totalAmount} BDT
              </p>
              <p>
                <b>Status:</b>{" "}
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                  {selectedOrder.status}
                </span>
              </p>
            </div>

            {/* ITEMS */}
            <div className="mt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText size={14} /> Items
              </h3>

              <ul className="text-sm mt-2 list-disc ml-5">
                {selectedOrder.items.map((item, i) => (
                  <li key={i}>
                    {item.name} × {item.qty}
                  </li>
                ))}
              </ul>
            </div>

            {/* NOTE */}
            <div className="mt-4">
              <h3 className="font-semibold">Note</h3>
              <p className="text-sm bg-gray-100 p-2 rounded">
                {selectedOrder.note}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
