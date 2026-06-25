"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export default function CrispChat() {
  useEffect(() => {
    Crisp.configure("d7527177-96bb-4740-8be7-fe4cda13f15a");

    // Move Crisp up from bottom
    Crisp.setSafeMode(true);

    setTimeout(() => {
      const crispBox = document.getElementById("crisp-chatbox");

      if (crispBox) {
        crispBox.style.bottom = "120px";
        crispBox.style.right = "20px";
      }
    }, 1000);
  }, []);

  return null;
}
