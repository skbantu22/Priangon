"use client";
import { useEffect } from "react";
import axios from "axios";

export default function PurchaseTracker({ order }) {
  useEffect(() => {
    // ১. অর্ডার ডাটা না থাকলে বা অলরেডি ট্র্যাক হয়ে থাকলে রিটার্ন করবে
    if (!order || !order._id) return;

    const storageKey = `tracked_pur_${order._id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey))
      return;

    const eventId = `pur_${order._id}`;

    // ২. ডাটা প্রিপারেশন
    const trackingData = {
      value: order.total || 0,
      currency: "BDT",
      // : any সরিয়ে দেওয়া হয়েছে
      content_ids:
        order.items?.map((item) => String(item.productId || item._id)) || [],
      content_type: "product",
      num_items: order.items?.length || 0,
    };

    // ৩. ব্রাউজার পিক্সেল
    if (window.fbq) {
      window.fbq("track", "Purchase", trackingData, { eventID: eventId });
    }

    // ৪. সার্ভার CAPI
    axios
      .post("/api/meta/capi", {
        event_name: "Purchase",
        event_id: eventId,
        url: window.location.href,
        phone: order.customer?.phone || "",
        full_name: order.customer?.name || "",
        address: order.customer?.address || "",
        district: order.customer?.cityId || "",
        custom_data: trackingData,
      })
      .catch(() => {});

    // ৫. সেশন স্টোরেজে সেভ করা যাতে ডুপ্লিকেট না হয়
    sessionStorage.setItem(storageKey, "true");
  }, [order?._id]);

  return null;
}
