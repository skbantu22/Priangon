"use client";

import { FaFacebookMessenger } from "react-icons/fa";

export default function MessengerButton({
  pageUsername = "minithailand2022",
  bottom = "bottom-42",
  right = "right-6",
}) {
  return (
    <a
      href={`https://m.me/${pageUsername}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Messenger"
      className={`
        fixed
        ${bottom}
        ${right}
        z-50
        flex
        h-13
        w-13
        md:h-15
        md:w-15
        items-center
        justify-center
        rounded-full
        bg-[#0084FF]
        text-white
        shadow-xl
        transition-all
        duration-300
        hover:scale-110
        hover:shadow-2xl
      `}
    >
      <FaFacebookMessenger className="h-8 w-8 md:h-10 md:w-10" />
    </a>
  );
}
