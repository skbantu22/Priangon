"use client";

import React from "react";
import { Package, X } from "lucide-react";

const CreateOrderModal = ({
  isOpen,
  onClose,
  newOrder,
  setNewOrder,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 rounded-lg">
              <Package className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-lg">Generate Mock Order</h3>

              <p className="text-xs text-slate-400">
                Add a new structured order directly to memory
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 text-sm font-medium">
          {/* Customer */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase">
              Customer Profile
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Customer Name *"
                value={newOrder?.customerName || ""}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    customerName: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={newOrder?.customerEmail || ""}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    customerEmail: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase">
              Product Details
            </label>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Product Item *"
                value={newOrder?.itemName || ""}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    itemName: e.target.value,
                  })
                }
                className="col-span-2 w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />

              <input
                type="number"
                required
                placeholder="Price ($) *"
                value={newOrder?.itemPrice || ""}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    itemPrice: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Payment */}
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">
                Payment Method
              </label>

              <select
                value={newOrder?.paymentMethod || "Credit Card"}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    paymentMethod: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Credit Card">Credit Card</option>

                <option value="PayPal">PayPal</option>

                <option value="Bank Transfer">Bank Transfer</option>

                <option value="Apple Pay">Apple Pay</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">
                Starting Status
              </label>

              <select
                value={newOrder?.status || "Pending"}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    status: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Pending">Pending</option>

                <option value="Processing">Processing</option>

                <option value="Shipped">Shipped</option>

                <option value="Delivered">Delivered</option>
              </select>
            </div>

            {/* Carrier */}
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">
                Carrier Service
              </label>

              <select
                value={newOrder?.carrier || "UPS"}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    carrier: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="UPS">UPS Express</option>

                <option value="FedEx">FedEx Home</option>

                <option value="DHL">DHL Worldwide</option>

                <option value="USPS">USPS Priority</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase">
              Fulfillment Destination
            </label>

            <input
              type="text"
              required
              placeholder="Shipping Address *"
              value={newOrder?.shippingAddress || ""}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  shippingAddress: e.target.value,
                })
              }
              className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-all"
            >
              Discard
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              Create Order Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
