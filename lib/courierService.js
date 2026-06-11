import axios from "axios";
import Courier from "@/models/Courier.model";

/**
 * Send order to courier dynamically
 */
export const sendToCourier = async (courierId, order) => {
  const courier = await Courier.findById(courierId);

  if (!courier) {
    throw new Error("Courier not found");
  }

  if (!courier.isActive) {
    throw new Error("Courier is not active");
  }

  const payload = {
    invoice: String(order._id),
    recipient_name: order.customer?.name,
    recipient_phone: order.customer?.phone,
    recipient_address: order.customer?.address,
    cod_amount: order.total,
    note: order.note || "",
  };

  console.log("🚚 Courier:", courier.name);
  console.log("📦 Payload:", payload);

  // 🔥 IMPORTANT FIX: correct endpoint
  const url = `${courier.apiUrl}/create_order`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Api-Key": courier.apiKey,
        "Secret-Key": courier.secretKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log("✅ Courier Success:", response.data);

    return response.data;
  } catch (err) {
    console.error("❌ Courier Error:", err.response?.data || err.message);

    throw new Error(err.response?.data?.message || err.message);
  }
};
