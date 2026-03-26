"use client";
import { useState } from "react";
import axios from "axios";
import { Search, Loader2, MapPin, Circle } from "lucide-react";

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
    <div className="max-w-lg mx-auto px-6 py-12 bg-white min-h-screen text-zinc-900">
      {/* --- Header --- */}
      <div className="mb-12">
        <h1 className="text-2xl font-bold tracking-tight">Track Order</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Enter details to see status
        </p>
      </div>

      {/* --- Input Group --- */}
      <form onSubmit={handleTrack} className="space-y-6 mb-16">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Order ID or Number"
            className="w-full py-3 border-b border-zinc-100 outline-none focus:border-black transition-colors font-medium placeholder:text-zinc-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Phone Number"
            className="w-full py-3 border-b border-zinc-100 outline-none focus:border-black transition-colors font-medium placeholder:text-zinc-300"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <button
          disabled={loading}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity disabled:opacity-30"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            "Track Now"
          )}
          {!loading && <Search size={16} />}
        </button>
      </form>

      {error && <p className="text-xs font-bold text-red-500 mb-8">{error}</p>}

      {/* --- Simple Timeline --- */}
      {orderData && (
        <div className="animate-in fade-in duration-700">
          <div className="mb-10 pb-6 border-b border-zinc-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-1">
              Current Status
            </p>
            <h2 className="text-xl font-bold capitalize">
              {orderData.currentStatus}
            </h2>
          </div>

          <div className="space-y-10">
            {orderData.history.map((event, index) => (
              <div key={event._id || index} className="flex gap-6">
                {/* Visual Marker */}
                <div className="flex flex-col items-center pt-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${index === 0 ? "bg-black scale-125" : "bg-zinc-200"}`}
                  />
                  {index !== orderData.history.length - 1 && (
                    <div className="w-px h-12 bg-zinc-100 mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4
                      className={`text-sm font-bold capitalize ${index === 0 ? "text-black" : "text-zinc-300"}`}
                    >
                      {event.status}
                    </h4>
                    <span className="text-[10px] font-medium text-zinc-300">
                      {new Date(event.createdAt).toLocaleDateString("en-BD", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${index === 0 ? "text-zinc-500" : "text-zinc-300"}`}
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
  );
}
