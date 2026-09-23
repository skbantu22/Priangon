import { SiApple, SiXiaomi, SiOneplus, SiHuawei } from "react-icons/si";

// Wordmark-style brand labels for the POS brand filter.
// Brands without an entry fall back to their plain name.
const BRANDS = {
  apple: { icon: SiApple, label: "Apple", className: "text-gray-900 dark:text-white" },
  xiaomi: { icon: SiXiaomi, iconClass: "text-[#ff6900]", label: "Xiaomi", className: "text-gray-800 dark:text-gray-100" },
  oneplus: { icon: SiOneplus, iconClass: "text-[#eb0028]", label: "OnePlus", className: "text-gray-800 dark:text-gray-100" },
  huawei: { icon: SiHuawei, iconClass: "text-[#cf0a2c]", label: "Huawei", className: "text-gray-800 dark:text-gray-100" },
  samsung: { label: "SAMSUNG", className: "font-extrabold tracking-[0.12em] text-[#1428a0] dark:text-[#6b82ff]" },
  realme: { label: "realme", dot: "bg-[#ffc915]", className: "font-bold text-gray-900 dark:text-white" },
  oppo: { label: "oppo", className: "text-[17px] font-semibold tracking-wide text-[#1ba784]" },
  vivo: { label: "vivo", className: "text-[17px] font-semibold italic tracking-wide text-[#415fff]" },
  infinix: { label: "Infinix", className: "font-extrabold text-gray-900 dark:text-white" },
  tecno: { label: "TECNO", className: "font-extrabold italic tracking-wider text-[#0b4dbb] dark:text-[#5b8def]" },
  nokia: { label: "NOKIA", className: "font-extrabold tracking-wider text-[#124191] dark:text-[#5b8def]" },
  jbl: { label: "JBL", className: "rounded bg-[#ff6600] px-1 font-black text-white" },
  boat: { label: "boAt", className: "font-black text-[#e0001b]" },
  anker: { label: "ANKER", className: "font-bold tracking-wider text-[#00a7e1]" },
  sandisk: { label: "SanDisk", className: "font-bold text-[#e41e26]" },
};

export default function BrandLogo({ brand }) {
  const b = BRANDS[String(brand).toLowerCase()];

  if (!b) return <span className="font-semibold">{brand}</span>;

  const Icon = b.icon;
  return (
    <span className={`flex items-center gap-1.5 ${b.className}`}>
      {Icon && <Icon className={`size-4 ${b.iconClass || ""}`} />}
      {b.dot && <span className={`size-2 rounded-sm ${b.dot}`} />}
      {b.label}
    </span>
  );
}
