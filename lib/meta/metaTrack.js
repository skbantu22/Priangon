import { getFBP, getFBC } from "@/lib/helpers/metaAdvanced";
import { sendWithRetry } from "@/lib/meta/retry";

/**
 * Meta Event Tracker (Pixel + CAPI) with Deduplication
 * @param {string} eventName - Standard Meta event name (e.g., 'AddToCart', 'Purchase')
 * @param {object} data - Event data (value, currency, content_ids, etc.)
 */
export const trackMetaEvent = async (eventName, data = {}) => {
  // ১. ইউনিক ইভেন্ট আইডি তৈরি (Deduplication এর জন্য সবচেয়ে গুরুত্বপূর্ণ)
  // randomUUID() এর বদলে লজিক-ভিত্তিক আইডি ব্যবহার করছি যাতে Browser ও Server আইডি সেম হয়।
  const timestamp = Date.now();
  const uniqueTag =
    data.content_ids && data.content_ids.length > 0
      ? data.content_ids[0]
      : Math.floor(Math.random() * 100000);

  const eventId = `${eventName.toLowerCase()}_${uniqueTag}_${timestamp}`;

  // ২. কুকি থেকে FBP এবং FBC ডাটা সংগ্রহ (SSR সেফটিসহ)
  const isBrowser = typeof window !== "undefined";
  const fbp = isBrowser ? getFBP() : null;
  const fbc = isBrowser ? getFBC() : null;

  // ৩. CLIENT SIDE (Browser Pixel)
  if (isBrowser && window.fbq) {
    window.fbq("track", eventName, data, { eventID: eventId });
    // ডেভেলপমেন্টের সময় চেক করার জন্য কনসোল লগ (পরে চাইলে রিমুভ করতে পারেন)
    console.log(`[Meta Pixel] Sent: ${eventName} | ID: ${eventId}`);
  }

  // ৪. SERVER SIDE (Conversion API) - Background-এ ডাটা পাঠাবে
  try {
    // এখানে await দেওয়ার দরকার নেই যদি আপনি পেজ লোড আটকাতে না চান,
    // তবে sendWithRetry নিজে থেকেই ফেলব্যাক হ্যান্ডেল করবে।
    sendWithRetry({
      event_name: eventName,
      event_id: eventId, // ✅ ব্রাউজার পিক্সেলের আইডির সাথে হুবহু এক
      url: isBrowser ? window.location.href : "",
      custom_data: data,

      // কাস্টমার ম্যাচিং ডাটা (যদি থাকে)
      email: data.email || null,
      phone: data.phone || null,
      first_name: data.first_name || null,
      last_name: data.last_name || null,

      fbp,
      fbc,
      user_agent: isBrowser ? navigator.userAgent : "Server-Side",
    }).catch((err) => console.error("[Meta CAPI Retry Error]:", err));
  } catch (error) {
    console.error(`[Meta CAPI Critical Error] ${eventName}:`, error);
  }
};
