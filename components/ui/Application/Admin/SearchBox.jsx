"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react"; // Added for better UX

const SearchBox = ({ onSelect }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [data, setData] = useState({ products: [], categories: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (value) => {
    setQuery(value);
    setShowDropdown(!!value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSearch(value);
    }, 300);
  };

  const fetchSearch = async (value) => {
    if (!value || value.length < 2) {
      setData({ products: [], categories: [] });
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(value)}`);
      console.log("Search results:", res.data);
      setData(res.data || { products: [], categories: [] });
    } catch (err) {
      console.error("Search API error:", err);
      setData({ products: [], categories: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuery = (q) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    router.push(`/shop?${params.toString()}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    updateQuery(query);
    setShowDropdown(false);
    if (onSelect) onSelect();
  };

  const handleClear = () => {
    setQuery("");
    setData({ products: [], categories: [] });
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  const wrapperRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full max-w-2xl mx-auto px-4 sm:px-0"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors">
          <Search size={18} />
        </div>

        <input
          type="text"
          placeholder="Search for items..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setShowDropdown(!!query)}
          className="w-full bg-zinc-100 border-2 border-transparent focus:border-black focus:bg-white p-3 pl-10 pr-10 rounded-none transition-all duration-200 text-sm md:text-base outline-none font-medium uppercase tracking-tight"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={16} className="text-zinc-500" />
          </button>
        )}

        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-zinc-400" />
          </div>
        )}
      </form>

      {/* DROPDOWN */}
      {showDropdown &&
        (data.products.length > 0 || data.categories.length > 0) && (
          <div className="absolute left-4 right-4 sm:left-0 sm:right-0 bg-white shadow-2xl mt-2 z-[100] max-h-[60vh] md:max-h-96 overflow-y-auto rounded-none border-2 border-black divide-y-2 divide-zinc-100">
            {/* Categories Section */}
            {data.categories.length > 0 && (
              <div className="bg-zinc-50">
                <div className="px-4 py-2 font-black text-[10px] uppercase tracking-widest text-zinc-400">
                  Found in Categories
                </div>
                {data.categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("category", cat.slug || cat._id);
                      router.push(`/shop?${params.toString()}`);
                      setShowDropdown(false);
                      if (onSelect) onSelect();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-black hover:text-white transition-colors flex justify-between items-center group"
                  >
                    <span className="text-sm font-bold uppercase">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300">
                      ({cat.count})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Products Section */}
            <div className="bg-white">
              <div className="px-4 py-2 font-black text-[10px] uppercase tracking-widest text-zinc-400">
                Products
              </div>
              {data.products.map((p) => (
                <button
                  key={p._id}
                  onClick={() => {
                    updateQuery(p.name || p.title);
                    setShowDropdown(false);
                    if (onSelect) onSelect();
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b last:border-b-0 border-zinc-50 flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-10 bg-zinc-100 shrink-0 overflow-hidden">
                    {p.media?.[0]?.secure_url && (
                      <img
                        src={p.media[0].secure_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-none">
                      {p.name || p.title}
                    </span>
                    {p.sellingPrice && (
                      <span className="text-[10px] font-mono text-zinc-500 italic">
                        ৳{p.sellingPrice}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

export default SearchBox;
