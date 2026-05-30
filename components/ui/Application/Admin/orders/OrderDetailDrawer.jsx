"use client";

import React from "react";
import { X, Mail, Phone, MapPin } from "lucide-react";

const getStatusBadge = (status) => {
  const styles = {
    Pending:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    Processing:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Shipped:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    Delivered:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
};

const OrderDetailDrawer = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <span className="text-[10px] font-black tracking-wider uppercase bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
              Order Dossier
            </span>

            <h2 className="text-xl font-black mt-1 text-slate-900 dark:text-white">
              {order.id}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-150 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Process Status
              </span>

              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Registered Date
              </span>

              <p className="text-xs font-semibold mt-1">{order.date}</p>
            </div>
          </div>

          {/* Customer */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
              Customer Profile
            </h3>

            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={order.customer?.avatar}
                  alt={order.customer?.name}
                  className="w-11 h-11 rounded-full object-cover border"
                />

                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {order.customer?.name}
                  </p>

                  <p className="text-xs text-slate-400">Account Verified</p>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-700/60"></div>

              <div className="grid grid-cols-1 gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />

                  <span>{order.customer?.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500" />

                  <span>{order.customer?.phone}</span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 mt-0.5" />

                  <span className="leading-tight">
                    {order.shipping?.address}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Tracker */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
              Delivery Tracker
            </h3>

            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                <span>Carrier: {order.shipping?.carrier}</span>

                <span>No: {order.shipping?.trackingNumber}</span>
              </div>

              <div className="relative pl-6 space-y-4 text-xs font-semibold">
                <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                {/* Delivered */}
                <div className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      order.status === "Delivered"
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  ></div>

                  <p
                    className={
                      order.status === "Delivered"
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }
                  >
                    Delivered to Destination
                  </p>
                </div>

                {/* Shipped */}
                <div className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      ["Delivered", "Shipped"].includes(order.status)
                        ? "bg-indigo-500"
                        : "bg-slate-300"
                    }`}
                  ></div>

                  <p
                    className={
                      ["Delivered", "Shipped"].includes(order.status)
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }
                  >
                    In Transit (Out for Delivery)
                  </p>
                </div>

                {/* Processing */}
                <div className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      ["Delivered", "Shipped", "Processing"].includes(
                        order.status,
                      )
                        ? "bg-amber-500"
                        : "bg-slate-300"
                    }`}
                  ></div>

                  <p
                    className={
                      ["Delivered", "Shipped", "Processing"].includes(
                        order.status,
                      )
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }
                  >
                    Package Handed to Logistics Carrier
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
              Itemized Receipt
            </h3>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700 grid grid-cols-4 font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-2">Product name</span>

                <span className="text-center">Qty</span>

                <span className="text-right">Price</span>
              </div>

              <div className="p-3 space-y-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 font-semibold">
                    <span className="col-span-2 text-slate-900 dark:text-white leading-tight">
                      {item.name}
                    </span>

                    <span className="text-center text-slate-500">
                      x{item.quantity}
                    </span>

                    <span className="text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3 border-t border-slate-150 dark:border-slate-700 space-y-1.5 font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>

                  <span>${order.total?.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>Payment Method</span>

                  <span>
                    {order.payment?.method} ({order.payment?.status})
                  </span>
                </div>

                <div className="h-px bg-slate-150 dark:bg-slate-700 my-1"></div>

                <div className="flex justify-between text-sm font-black text-slate-950 dark:text-white">
                  <span>Grand Total</span>

                  <span>${order.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailDrawer;
