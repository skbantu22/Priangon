"use client";
import { useState } from "react";
import axios from "axios";
import { Search, Loader2 } from "lucide-react";

export default function TrackOrderPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrderData(null);

    try {
      const { data } = await axios.get(
        `/api/track-order?query=${searchQuery.trim()}&phone=${phone.trim()}`,
      );
      setOrderData(data);
    } catch (err) {
      setError("Order not found. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold">Track your order</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Enter your order details below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleTrack} className="space-y-5">
          <input
            type="text"
            placeholder="Order ID or Number"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Phone Number"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <button
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                Track Order <Search size={16} />
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mt-4 font-medium">{error}</p>
        )}

        {/* Result */}
        {orderData && (
          <div className="mt-10">
            {/* Status */}
            <div className="mb-6">
              <p className="text-xs text-zinc-400 uppercase mb-1">
                Current Status
              </p>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-black text-white rounded-full capitalize">
                {orderData.currentStatus}
              </span>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {orderData.history.map((event, index) => (
                <div key={index} className="flex gap-4">
                  {/* Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        index === 0 ? "bg-black" : "bg-zinc-300"
                      }`}
                    />
                    {index !== orderData.history.length - 1 && (
                      <div className="w-px h-10 bg-zinc-200 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4
                        className={`text-sm font-medium capitalize ${
                          index === 0 ? "text-black" : "text-zinc-400"
                        }`}
                      >
                        {event.status}
                      </h4>
                      <span className="text-xs text-zinc-400">
                        {new Date(event.createdAt).toLocaleDateString("en-BD", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <p
                      className={`text-xs mt-1 ${
                        index === 0 ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      {event.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
