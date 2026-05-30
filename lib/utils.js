import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const sizes = [
  // Standard clothing sizes
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "L", value: "L" },
  { label: "XL", value: "XL" },
  { label: "2XL", value: "2XL" },
  { label: "3XL", value: "3XL" },

  // Numeric waist sizes
  { label: "28", value: "28" },
  { label: "30", value: "30" },
  { label: "32", value: "32" },
  { label: "34", value: "34" },
  { label: "36", value: "36" },
  { label: "38", value: "38" },
  { label: "40", value: "40" },

  { label: "Free Size", value: "FREE_SIZE" },
  { label: "15 ml", value: "15_ML" },
  { label: "100 ml", value: "100_ML" },
  { label: "200 ml", value: "200_ML" },

  // Bedding sizes
  { label: "Single", value: "Single" },
  { label: "Double", value: "Double" },
  { label: "Queen", value: "Queen" },
  { label: "King", value: "King" },
  { label: "Super King", value: "SuperKing" },

  // 🧠 NEW: Body Fit Range Sizes (your case)
  { label: "Free Size (Body Up to 40)", value: "FREE_UPTO_40" },
  { label: "Free Size (Body Up to 41)", value: "FREE_UPTO_41" },
  { label: "Free Size (Body Up to 42)", value: "FREE_UPTO_42" },
  { label: "FREE SIZE UP TO 34 TO 46", value: "FREE_34_TO_46" },
];
