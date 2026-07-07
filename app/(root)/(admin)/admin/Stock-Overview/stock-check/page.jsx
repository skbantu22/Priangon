"use client";

import { useEffect, useState, useMemo } from "react";

export default function StockOverviewPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetch("/api/stock/stock-overview")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          // Flattening with safety checks
          const flatItems = res.data.flatMap((zone) => zone.items || []);
          setData(flatItems);
        }
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set();
    data.forEach((i) => {
      if (i.category) cats.add(i.category.toLowerCase());
    });
    return ["ALL", ...Array.from(cats)];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Safety check: Fallback to "" if name or category is missing
      const name = (item.name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();

      const matchesSearch = name.includes(search.toLowerCase());
      const matchesCat =
        activeCategory === "ALL" || cat === activeCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [data, search, activeCategory]);

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        maxWidth: "1000px",
        margin: "auto",
      }}
    >
      <h1>Stock Management</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search product..."
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px",
            flex: 1,
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />
        <select
          onChange={(e) => setActiveCategory(e.target.value)}
          style={{ padding: "10px", borderRadius: "5px" }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        {filteredData.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelectedItem(item)}
            style={{
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              cursor: "pointer",
              background: "#f9f9f9",
              transition: "0.2s",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
              {item.name || "Unnamed Product"}
            </h3>
            <span
              style={{
                fontSize: "12px",
                background: "#eee",
                padding: "3px 8px",
                borderRadius: "3px",
              }}
            >
              {item.category || "Uncategorized"}
            </span>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "10px",
              width: "300px",
            }}
          >
            <h2>{selectedItem.name}</h2>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {selectedItem.variants?.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span>Size: {v.size || "N/A"}</span>
                  <strong>{v.stock || 0} pcs</strong>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "10px",
                cursor: "pointer",
                background: "#333",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
