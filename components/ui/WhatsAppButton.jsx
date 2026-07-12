"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton({
  phone = "8801706126663",
  message = "Hello",
  bottom = "bottom-28",
  mdBottom = "md:bottom-24",
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
        ${mdBottom}
        ${right}
        z-50
        flex
        h-14
        w-14
        md:h-16
        md:w-16
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
      <FaWhatsapp className="h-8 w-8" />
    </a>
  );
}
