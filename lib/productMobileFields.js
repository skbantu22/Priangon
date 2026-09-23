import { WARRANTY_TYPES } from "@/lib/warranty";

// brand / warranty / IMEI-tracking fields sent by the product forms,
// sanitised for saving on a Product
export const cleanMobileFields = (payload = {}) => {
  const type = Object.hasOwn(WARRANTY_TYPES, payload.warrantyType)
    ? payload.warrantyType
    : "none";
  const months = Math.max(0, Math.min(120, Math.round(Number(payload.warrantyMonths) || 0)));

  return {
    brand: String(payload.brand || "").trim().slice(0, 60),
    // a warranty needs both a type and a period
    warranty: type === "none" || !months ? { type: "none", months: 0 } : { type, months },
    trackSerial: payload.trackSerial === true || payload.trackSerial === "true",
  };
};
