// Shared warranty helpers (client + server)

export const WARRANTY_TYPES = {
  none: "No Warranty",
  official: "Official Warranty",
  brand: "Brand Warranty",
  shop: "Shop Warranty",
};

// "12" -> "1 Year", "6" -> "6 Months"
export const formatWarrantyPeriod = (months) => {
  const m = Number(months) || 0;
  if (m <= 0) return "";
  if (m % 12 === 0) return `${m / 12} Year${m / 12 > 1 ? "s" : ""}`;
  return `${m} Month${m > 1 ? "s" : ""}`;
};

// "1 Year Official Warranty" or "" when the product has none
export const warrantyLabel = (warranty) => {
  const type = warranty?.type || warranty?.warrantyType || "none";
  const months = warranty?.months ?? warranty?.warrantyMonths ?? 0;
  if (type === "none" || !months) return "";
  return `${formatWarrantyPeriod(months)} ${WARRANTY_TYPES[type] || "Warranty"}`;
};

export const warrantyExpiryDate = (saleDate, months) => {
  const m = Number(months) || 0;
  if (m <= 0) return null;
  const d = new Date(saleDate || Date.now());
  d.setMonth(d.getMonth() + m);
  return d;
};

// { active, daysLeft } for an expiry date (null expiry = no warranty)
export const warrantyStatus = (expiry, now = new Date()) => {
  if (!expiry) return { active: false, daysLeft: 0, none: true };
  const ms = new Date(expiry).getTime() - now.getTime();
  const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return { active: daysLeft > 0, daysLeft: Math.max(0, daysLeft), none: false };
};

// 15-digit IMEI or any 6+ char serial number
export const isValidSerial = (value) =>
  /^[A-Za-z0-9-]{6,20}$/.test(String(value || "").trim());
