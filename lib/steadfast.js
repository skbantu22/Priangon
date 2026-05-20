// lib/steadfast.js

import axios from "axios";

const BASE_URL =
  process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";

const steadfast = axios.create({
  baseURL: BASE_URL,

  headers: {
    "Api-Key": process.env.STEADFAST_API_KEY,

    "Secret-Key": process.env.STEADFAST_SECRET_KEY,

    "Content-Type": "application/json",
  },

  timeout: 30000,
});

// =========================
// CREATE ORDER
// =========================

export const createSteadfastOrder = async ({
  orderNumber,
  customerName,
  phone,
  address,
  total,
  note = "",
  items = [],
}) => {
  try {
    const payload = {
      invoice: String(orderNumber),

      recipient_name: customerName,

      recipient_phone: phone,

      recipient_address: address,

      cod_amount: Number(total),

      note,

      item_description: items.map((i) => `${i.name} x${i.quantity}`).join(", "),
    };

    const res = await steadfast.post("/create_order", payload);

    return res.data;
  } catch (err) {
    console.error(
      "STEADFAST CREATE ORDER ERROR:",
      err?.response?.data || err.message,
    );

    throw new Error(
      err?.response?.data?.message || "Failed to create steadfast order",
    );
  }
};

// =========================
// TRACK ORDER
// =========================

export const trackSteadfastOrder = async (trackingCode) => {
  try {
    const res = await steadfast.get(`/status_by_trackingcode/${trackingCode}`);

    return res.data;
  } catch (err) {
    console.error("STEADFAST TRACK ERROR:", err?.response?.data || err.message);

    throw new Error("Failed to track order");
  }
};

// =========================
// GET BALANCE
// =========================

export const getSteadfastBalance = async () => {
  try {
    const res = await steadfast.get("/get_balance");

    return res.data;
  } catch (err) {
    console.error(
      "STEADFAST BALANCE ERROR:",
      err?.response?.data || err.message,
    );

    throw new Error("Failed to get balance");
  }
};

export default steadfast;
