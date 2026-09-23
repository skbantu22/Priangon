// Starter catalog for the MobiZone mobile shop (used by the seed and image scripts)

export const CATEGORIES = [
  "Mobile Phones",
  "Cases & Covers",
  "Chargers & Adapters",
  "Earphones & Headphones",
  "Power Bank",
  "Smart Watch",
  "Others",
];

export const C = (name, hex, accent = "#6d28d9") => ({ name, hex, accent });

// options: [label, sellingPrice, mrp]
export const PRODUCTS = [
  // ---- Mobile phones: color x storage ----
  { name: "iPhone 15", cat: "Mobile Phones", kind: "phone", colors: [C("Black", "#2b2b2e", "#f472b6"), C("Pink", "#f9c6d3", "#fb7185")], options: [["128GB", 99999, 104999], ["256GB", 114999, 119999]] },
  { name: "Samsung Galaxy S24", cat: "Mobile Phones", kind: "phone", colors: [C("Onyx Black", "#1f2937", "#64748b"), C("Marble Grey", "#9ca3af", "#94a3b8")], options: [["8/256GB", 89999, 94999]] },
  { name: "OnePlus Nord CE 4", cat: "Mobile Phones", kind: "phone", colors: [C("Dark Chrome", "#111827", "#14b8a6"), C("Celadon Marble", "#99f6e4", "#2dd4bf")], options: [["8/128GB", 33999, 35999], ["8/256GB", 36999, 38999]] },
  { name: "Xiaomi Redmi 13C", cat: "Mobile Phones", kind: "phone", colors: [C("Glacier White", "#e5e7eb", "#f59e0b"), C("Midnight Black", "#1f2937", "#f59e0b")], options: [["4/128GB", 15999, 16999], ["6/128GB", 17999, 18999]] },
  { name: "realme Narzo 70", cat: "Mobile Phones", kind: "phone", colors: [C("Forest Green", "#065f46", "#10b981")], options: [["6/128GB", 24999, 26999]] },
  { name: "Samsung Galaxy A15", cat: "Mobile Phones", kind: "phone", colors: [C("Blue Black", "#1e293b", "#3b82f6"), C("Light Blue", "#bfdbfe", "#60a5fa")], options: [["6/128GB", 21999, 22999]] },
  { name: "Vivo Y18", cat: "Mobile Phones", kind: "phone", colors: [C("Space Black", "#18181b", "#8b5cf6"), C("Gem Green", "#6ee7b7", "#34d399")], options: [["4/128GB", 16999, 17999]] },
  { name: "OPPO A18", cat: "Mobile Phones", kind: "phone", colors: [C("Glowing Blue", "#1d4ed8", "#38bdf8")], options: [["4/64GB", 13499, 14499], ["4/128GB", 14999, 15999]] },
  { name: "Infinix Hot 40", cat: "Mobile Phones", kind: "phone", colors: [C("Starlit Black", "#0f172a", "#a855f7"), C("Palm Blue", "#0ea5e9", "#22d3ee")], options: [["8/256GB", 18999, 19999]] },
  { name: "TECNO Spark 20", cat: "Mobile Phones", kind: "phone", colors: [C("Gravity Black", "#111827", "#f97316")], options: [["8/128GB", 14499, 15499]] },
  { name: "Nokia 105", cat: "Mobile Phones", kind: "phone", colors: [C("Charcoal", "#27272a", "#0ea5e9"), C("Blue", "#1e40af", "#0ea5e9")], options: [["Dual SIM", 2099, 2299]] },

  // ---- Accessories ----
  { name: "Spigen Phone Case", cat: "Cases & Covers", kind: "case", colors: [C("Black", "#1f2937"), C("Clear", "#cbd5e1")], options: [["iPhone 15", 1299, 1499], ["Galaxy S24", 1199, 1399]] },
  { name: "Tempered Glass", cat: "Cases & Covers", kind: "glass", colors: [C("Clear", "#e0f2fe")], options: [["iPhone 15", 499, 699], ["Galaxy A15", 349, 499], ["Redmi 13C", 299, 449]] },
  { name: "Samsung 25W Charger", cat: "Chargers & Adapters", kind: "charger", colors: [C("White", "#ffffff"), C("Black", "#374151")], options: [["Adapter only", 1499, 1799]] },
  { name: "Type-C Data Cable", cat: "Chargers & Adapters", kind: "cable", colors: [C("Black", "#111827"), C("White", "#e5e7eb")], options: [["1m", 599, 799], ["2m", 799, 999]] },
  { name: "AirPods Pro (2nd Gen)", cat: "Earphones & Headphones", kind: "earbuds", colors: [C("White", "#ffffff")], options: [["USB-C", 22499, 24999]] },
  { name: "boAt Rockerz 450", cat: "Earphones & Headphones", kind: "headphones", colors: [C("Luscious Black", "#111827"), C("Aqua Blue", "#0891b2")], options: [["Standard", 3999, 4499]] },
  { name: "JBL Tune 520BT", cat: "Earphones & Headphones", kind: "headphones", colors: [C("Black", "#1f2937"), C("Blue", "#1d4ed8")], options: [["Standard", 4999, 5499]] },
  { name: "Anker 20000mAh Power Bank", cat: "Power Bank", kind: "powerbank", colors: [C("Black", "#1f2937")], options: [["20W", 2899, 3299]] },
  { name: "Xiaomi 10000mAh Power Bank", cat: "Power Bank", kind: "powerbank", colors: [C("Blue", "#1e3a8a"), C("Black", "#111827")], options: [["22.5W", 1799, 1999]] },
  { name: "Apple Watch Series 9", cat: "Smart Watch", kind: "watch", colors: [C("Midnight", "#1f2937", "#0f172a"), C("Starlight", "#e7e5e4", "#1e1b4b")], options: [["41mm", 52999, 55999], ["45mm", 56999, 59999]] },
  { name: "Amazfit Bip 5", cat: "Smart Watch", kind: "watch", colors: [C("Soft Black", "#27272a", "#312e81"), C("Pastel Pink", "#fbcfe8", "#831843")], options: [["Standard", 8999, 9999]] },
  { name: "SanDisk 128GB Card", cat: "Others", kind: "memory", colors: [C("Red", "#dc2626")], options: [["Class 10", 1399, 1599]] },

  // ---- more popular models ----
  { name: "iPhone 16 Pro Max", cat: "Mobile Phones", kind: "phone", colors: [C("Desert Titanium", "#c8b199", "#b45309"), C("Black Titanium", "#27272a", "#475569")], options: [["256GB", 179999, 189999], ["512GB", 209999, 219999]] },
  { name: "Samsung Galaxy A55 5G", cat: "Mobile Phones", kind: "phone", colors: [C("Awesome Navy", "#1e3a8a", "#6366f1"), C("Awesome Iceblue", "#bae6fd", "#38bdf8")], options: [["8/128GB", 47999, 49999], ["8/256GB", 52999, 54999]] },
  { name: "Xiaomi Redmi Note 13", cat: "Mobile Phones", kind: "phone", colors: [C("Ocean Teal", "#0f766e", "#2dd4bf"), C("Midnight Black", "#111827", "#6366f1")], options: [["6/128GB", 22999, 23999], ["8/256GB", 26999, 27999]] },
  { name: "realme C67", cat: "Mobile Phones", kind: "phone", colors: [C("Sunny Oasis", "#fde68a", "#f59e0b"), C("Black Rock", "#1f2937", "#64748b")], options: [["8/128GB", 20999, 21999]] },
  { name: "Anker Soundcore R50i", cat: "Earphones & Headphones", kind: "earbuds", colors: [C("Black", "#1f2937"), C("White", "#f3f4f6")], options: [["Standard", 1899, 2299]] },
  { name: "Baseus 65W GaN Charger", cat: "Chargers & Adapters", kind: "charger", colors: [C("White", "#ffffff"), C("Black", "#374151")], options: [["3 Port", 3499, 3999]] },

  // ---- more stock for dealers ----
  { name: "iPhone 13", cat: "Mobile Phones", kind: "phone", colors: [C("Midnight", "#1f2937", "#6366f1"), C("Starlight", "#f5f0e6", "#f59e0b")], options: [["128GB", 74999, 79999]] },
  { name: "Samsung Galaxy A35 5G", cat: "Mobile Phones", kind: "phone", colors: [C("Awesome Navy", "#1e3a8a", "#818cf8"), C("Awesome Lilac", "#ddd6fe", "#a78bfa")], options: [["8/128GB", 39999, 41999], ["8/256GB", 44999, 46999]] },
  { name: "Samsung Galaxy A05", cat: "Mobile Phones", kind: "phone", colors: [C("Black", "#111827", "#22c55e"), C("Silver", "#d1d5db", "#38bdf8")], options: [["4/64GB", 11999, 12999], ["6/128GB", 13999, 14999]] },
  { name: "Xiaomi Redmi A3", cat: "Mobile Phones", kind: "phone", colors: [C("Midnight Black", "#111827", "#f43f5e"), C("Olive Green", "#4d7c0f", "#a3e635")], options: [["3/64GB", 10999, 11499], ["4/128GB", 12499, 12999]] },
  { name: "Xiaomi POCO X6 Pro", cat: "Mobile Phones", kind: "phone", colors: [C("POCO Yellow", "#facc15", "#1f2937"), C("Black", "#111827", "#eab308")], options: [["8/256GB", 38999, 40999], ["12/512GB", 45999, 47999]] },
  { name: "OPPO Reno 11 F", cat: "Mobile Phones", kind: "phone", colors: [C("Ocean Blue", "#0369a1", "#67e8f9"), C("Palm Green", "#15803d", "#86efac")], options: [["8/256GB", 42990, 44990]] },
  { name: "vivo V30", cat: "Mobile Phones", kind: "phone", colors: [C("Peacock Green", "#0f766e", "#5eead4"), C("Noble Black", "#111827", "#a78bfa")], options: [["12/256GB", 55999, 57999]] },
  { name: "Infinix Note 40", cat: "Mobile Phones", kind: "phone", colors: [C("Racing Gray", "#4b5563", "#f97316"), C("Titan Gold", "#ca8a04", "#fde68a")], options: [["8/256GB", 23999, 24999]] },
  { name: "TECNO Camon 30", cat: "Mobile Phones", kind: "phone", colors: [C("Basaltic Dark", "#1f2937", "#0ea5e9"), C("Uyuni White", "#f3f4f6", "#60a5fa")], options: [["8/256GB", 27999, 28999]] },
  { name: "Samsung Galaxy Buds FE", cat: "Earphones & Headphones", kind: "earbuds", colors: [C("Graphite", "#374151"), C("White", "#f9fafb")], options: [["Standard", 8999, 9999]] },
  { name: "Xiaomi Redmi Buds 5", cat: "Earphones & Headphones", kind: "earbuds", colors: [C("Midnight Black", "#111827"), C("Fantasy White", "#f3f4f6")], options: [["Standard", 3499, 3999]] },
  { name: "Samsung Galaxy Watch 6", cat: "Smart Watch", kind: "watch", colors: [C("Graphite", "#374151", "#1e3a8a"), C("Silver", "#d1d5db", "#0f172a")], options: [["40mm", 29999, 32999], ["44mm", 32999, 35999]] },
  { name: "Xiaomi Smart Band 8", cat: "Smart Watch", kind: "watch", colors: [C("Graphite Black", "#1f2937", "#f97316"), C("Champagne Gold", "#d4b483", "#1e1b4b")], options: [["Standard", 3999, 4499]] },
  { name: "Anker 10000mAh Power Bank", cat: "Power Bank", kind: "powerbank", colors: [C("Black", "#111827"), C("White", "#e5e7eb")], options: [["22.5W", 2299, 2599]] },
  { name: "Samsung 45W Charger", cat: "Chargers & Adapters", kind: "charger", colors: [C("Black", "#1f2937")], options: [["Adapter only", 3299, 3799]] },
  { name: "Lightning Data Cable", cat: "Chargers & Adapters", kind: "cable", colors: [C("White", "#e5e7eb")], options: [["1m", 699, 899]] },
  { name: "Samsung Silicone Case", cat: "Cases & Covers", kind: "case", colors: [C("Black", "#1f2937"), C("Navy", "#1e3a8a"), C("Lavender", "#c4b5fd")], options: [["Galaxy A35", 999, 1299], ["Galaxy A55", 1099, 1399]] },
  { name: "SanDisk 64GB Card", cat: "Others", kind: "memory", colors: [C("Red", "#dc2626")], options: [["Class 10", 849, 999]] },
];

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
