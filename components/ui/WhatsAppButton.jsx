"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton({
  phone = "8801619421979",
  message = "Hello",
  bottom = "bottom-20",
  right = "right-6",
}) {
  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className={`
        fixed
        ${bottom}
        ${right}
        z-50
        flex
        h-12
        w-12
        md:h-15
        md:w-15
        items-center
        justify-center
        rounded-full
        bg-[#25D366]
        text-white
        shadow-xl
        transition-all
        duration-300
        hover:scale-110
        hover:shadow-2xl
      `}
    >
      <FaWhatsapp className="h-8 w-8 md:h-8 md:w-8" />
    </a>
  );
}
