"use client";

import { useEffect, useState } from "react";
import { X, Truck } from "lucide-react";

export default function CourierModal({
  isOpen,
  onClose,
  targetsCount,
  selectedCarrier,
  setSelectedCarrier,
  onConfirm,
}) {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCouriers = async () => {
      try {
        const res = await fetch("/api/couriers");
        const data = await res.json();

        setCouriers(data.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchCouriers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedCarrier) {
      alert("Please select a courier");
      return;
    }

    setLoading(true);

    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-lg">Assign Courier</h2>
          </div>

          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-2">Selected Orders</p>

            <div className="bg-slate-100 rounded-lg px-3 py-2 font-semibold">
              {targetsCount} Order(s)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Courier
            </label>

            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose Courier</option>

              {couriers.map((courier) => (
                <option key={courier._id} value={courier._id}>
                  {courier.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!selectedCarrier || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Courier Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
