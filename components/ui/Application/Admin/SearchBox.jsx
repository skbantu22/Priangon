"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

const SearchBox = ({onSelect}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [data, setData] = useState({ products: [], categories: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  // Handle input change with debounce
  const handleChange = (value) => {
    setQuery(value);
    setShowDropdown(!!value);

    // debounce API call
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

    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(value)}`);
      setData(res.data || { products: [], categories: [] });
    } catch (err) {
      console.error("Search API error:", err);
      setData({ products: [], categories: [] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateQuery(query);
    setShowDropdown(false);
  };

  const updateQuery = (q) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    router.push(`/shop?${params.toString()}`);
  };

  const handleSelectProduct = (name) => {
    updateQuery(name);
    setShowDropdown(false);
    if (onSelect) onSelect();
  };

  const handleSelectCategory = (catId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", catId);
    params.delete("q"); // optional: clear search
    router.push(`/shop?${params.toString()}`);
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
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search product..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setShowDropdown(!!query)}
          className="w-full border p-3 rounded"
        />
      </form>

      {showDropdown && (data.products.length > 0 || data.categories.length > 0) && (
        <div className="absolute bg-white shadow w-full mt-1 z-50 max-h-80 overflow-auto rounded border">
          {/* Categories */}
          {data.categories.length > 0 && (
            <div className="border-b px-2 py-1 font-bold text-sm text-gray-600">
              Categories
            </div>
          )}
          {data.categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => handleSelectCategory(cat._id)}
              className="w-full text-left p-2 hover:bg-gray-100"
            >
              {cat.name} ({cat.count})
            </button>
          ))}

        
          {data.products.map((p) => (
            <button
              key={p._id}
              onClick={() => handleSelectProduct(p.title || p.name)}
              className="w-full text-left p-2 hover:bg-gray-100"
            >
              {p.title || p.name}
            </button>
          ))}

          {data.products.length === 0 && data.categories.length === 0 && (
            <div className="p-2 text-gray-500 text-sm">No results</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;