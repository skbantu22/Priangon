import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


 export const sizes = [
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "L", value: "L" },
  { label: "XL", value: "XL" },
  { label: "2X ", value: "2XL" },
  { label: "3X ", value: "3XL" },
   { label: "28", value: "28" },
  { label: "30", value: "30" },
  { label: "32", value: "32" },
  { label: "34", value: "34" },
  { label: "36", value: "36" },
  { label: "38", value: "38" },
  { label: "40", value: "40" },
    { label: "Single", value: "Single" },
  { label: "Double", value: "Double" },
  { label: "Queen", value: "Queen" },
  { label: "King", value: "King" },
  { label: "Super King", value: "SuperKing" },
  { label: "Free Size", value: "FreeSize" },
  { label: "One Size", value: "OneSize" },
  { label: "Custom Size", value: "CustomSize" },
  {label: "Other", value: "Other" },
  { label: "Not Applicable", value: "NotApplicable" },
  { label: "Unknown", value: "Unknown" },
  {label: "Variable", value: "Variable" },
  {label: "Not Specified", value: "NotSpecified" },
];
