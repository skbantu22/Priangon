"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export default function CrispChat() {
  useEffect(() => {
    Crisp.configure("d7527177-96bb-4740-8be7-fe4cda13f15a");

    const timer = setInterval(() => {
      const el = document.getElementById("crisp-chatbox");

      if (el) {
        el.style.setProperty("bottom", "120px", "important");
        el.style.setProperty("right", "20px", "important");
      }
    }, 200);

    return () => clearInterval(timer);
  }, []);

  return null;
}
