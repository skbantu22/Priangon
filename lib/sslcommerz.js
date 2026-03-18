// lib/sslcommerz.js
export const getSSLBaseURL = () => {
  const isLive = String(process.env.NEXT_SSLCOMMERZ_IS_LIVE || "false").toLowerCase() === "true";
  return isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
};

export const getSSLValidateURL = (val_id) => {
  const base = getSSLBaseURL();
  const store_id = encodeURIComponent(process.env.NEXT_SSLCOMMERZ_STORE_ID || "");
  const store_passwd = encodeURIComponent(process.env.NEXT_SSLCOMMERZ_STORE_PASS || "");
  const v = "1";
  const format = "json";

  return `${base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
    val_id
  )}&store_id=${store_id}&store_passwd=${store_passwd}&v=${v}&format=${format}`;
};

export async function sslValidate(val_id) {
  if (!val_id) throw new Error("val_id missing");
  if (!process.env.NEXT_SSLCOMMERZ_STORE_ID || !process.env.NEXT_SSLCOMMERZ_STORE_PASS) {
    throw new Error("Missing SSL env store id/pass");
  }

  const url = getSSLValidateURL(val_id);
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) throw new Error(`SSL validate HTTP ${res.status}`);
  return data;
}

export function pickSSLPaymentIndex(order, { tran_id }) {
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  if (!payments.length) return 0;

  if (tran_id) {
    const found = payments
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p?.method === "sslcommerz")
      .reverse()
      .find(({ p }) => p?.paymentId === tran_id)?.i;

    if (typeof found === "number") return found;
  }

  const last = payments
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p?.method === "sslcommerz")
    .reverse()[0]?.i;

  return typeof last === "number" ? last : 0;
}

export function isValidSSLStatus(s) {
  return s === "VALID" || s === "VALIDATED";
}
