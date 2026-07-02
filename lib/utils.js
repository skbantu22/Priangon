import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const sizes = [
  // Standard clothing sizes

  // 🧠 NEW: Body Fit Range Sizes (your case)
  { label: "Free Size (Body Up to 40)", value: "FREE_UPTO_40" },
  { label: "Free Size (Body Up to 41)", value: "FREE_UPTO_41" },
  { label: "Free Size (Body Up to 42)", value: "FREE_UPTO_42" },
  { label: "FREE SIZE UP TO 34 TO 46", value: "FREE_34_TO_46" },
  { label: " 34 UP TO 40", value: "FREE_34_TO_40" },
  { label: " 40 UP TO 46", value: "FREE_40_TO_46" },
  {
    label: "BODY FREE SIZE FROM 34” TO 46“ (ONE SIZE )",
    value: "FREE_34_TO_46_ONE_SIZE",
  },

  {
    label: "BODY FREE SIZE FROM 34” TO 48“ (ONE SIZE )",
    value: "FREE_34_TO_48_ONE_SIZE",
  },

  {
    label: "BODY FREE SIZE FROM 34” TO 46“ (ONE SIZE )",
    value: "FREE_34_TO_46_ONE_SIZE",
  },

  {
    label: "BODY FREE SIZE FROM 34” TO 50+“ (ONE SIZE )",
    value: "FREE_34_TO_50+_ONE_SIZE",
  },

  {
    label: "40 UP TO 46",
    value: "40 UP TO 46",
  },
];
