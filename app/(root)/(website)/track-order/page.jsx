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
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-white to-zinc-200 flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-black/10 via-zinc-300/20 to-black/10 blur-xl opacity-60 rounded-3xl"></div>

        {/* Main Card */}
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-3xl p-8 transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-tight">
              Track your order
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Enter your details below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleTrack} className="space-y-5">
            <input
              type="text"
              placeholder="Order ID or Number"
              className="w-full px-4 py-3 rounded-xl bg-white/70 backdrop-blur border border-zinc-200 focus:border-black focus:ring-2 focus:ring-black/10 outline-none text-sm transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Phone Number"
              className="w-full px-4 py-3 rounded-xl bg-white/70 backdrop-blur border border-zinc-200 focus:border-black focus:ring-2 focus:ring-black/10 outline-none text-sm transition-all duration-200"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <button
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl text-sm font-medium tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
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
                <p className="text-xs text-zinc-400 uppercase mb-2">
                  Current Status
                </p>
                <span className="inline-block px-4 py-1.5 text-xs font-semibold bg-black text-white rounded-full capitalize shadow">
                  {orderData.currentStatus}
                </span>
              </div>

              {/* Timeline Card */}
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-6">
                {orderData.history.map((event, index) => (
                  <div key={event._id || index} className="flex gap-4">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0 ? "bg-black scale-110" : "bg-zinc-300"
                        }`}
                      />
                      {index !== orderData.history.length - 1 && (
                        <div className="w-px h-12 bg-zinc-200 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4
                          className={`text-sm font-medium capitalize ${
                            index === 0 ? "text-black" : "text-zinc-400"
                          }`}
                        >
                          {event.status}
                        </h4>

                        <span className="text-xs text-zinc-400">
                          {new Date(event.createdAt).toLocaleDateString(
                            "en-BD",
                            {
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </span>
                      </div>

                      <p
                        className={`text-xs mt-1 leading-relaxed ${
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
    </div>
  );
}
