"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export default function CrispChat() {
  useEffect(() => {
    Crisp.configure("96947cdd-9b94-4e99-99bc-c4f4922b71f2");
  }, []);

  return null;
}
