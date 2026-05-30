"use client";

import React from "react";
import { Truck, X, Check } from "lucide-react";

function CourierModal({
  isOpen,
  onClose,
  targetsCount,
  selectedCarrier,
  setSelectedCarrier,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-950/40 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-base">Send to Courier</h3>

              <p className="text-xs text-slate-400">
                Dispatch {targetsCount} order(s) instantly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm font-medium">
          <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
            You are about to transmit the selected order files to your
            fulfillment logistics network. This will automatically transition
            their status to{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              Shipped
            </strong>{" "}
            and append a tracking sequence.
          </p>

          {/* Carrier Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Select Logistics Carrier
            </label>

            <div className="grid grid-cols-2 gap-2">
              {["UPS", "FedEx", "DHL", "USPS"].map((carrier) => (
                <button
                  key={carrier}
                  type="button"
                  onClick={() => setSelectedCarrier(carrier)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedCarrier === carrier
                      ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-400 ring-2 ring-blue-500/10"
                      : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>{carrier} Shipping</span>

                  {selectedCarrier === carrier && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={!selectedCarrier}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/15 transition"
            >
              Dispatch Cargo Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourierModal;
