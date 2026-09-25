import {
  ADMIN_APP_SETTINGS,
  ADMIN_ATTRIBUTE_SHOW,
  ADMIN_BRAND_SHOW,
  ADMIN_CATEGORY_SHOW,
  ADMIN_COUPON_ADD,
  ADMIN_EXPENSE_SHOW,
  ADMIN_PRODUCT__VARIANT_SHOW,
  ADMIN_PRODUCT_ADD,
  ADMIN_PRODUCT_COLOR,
  ADMIN_PRODUCT_SHOW,
  ADMIN_PURCHASE_SHOW,
  ADMIN_REPORT_DUE,
  ADMIN_REPORT_PROFIT_LOSS,
  ADMIN_SUPPLIER_SHOW,
  ADMIN_SUPPORT_TICKETS,
  ADMIN_SYSTEM_SETTINGS,
  ADMIN_UNIT_SHOW,
} from "@/Route/Adminpannelroute";
import {
  IoHome,
  IoCart,
  IoCube,
  IoReceipt,
  IoPerson,
  IoDownload,
  IoLayers,
  IoWallet,
  IoBarChart,
  IoMegaphone,
  IoGlobe,
  IoPhonePortrait,
  IoPeople,
  IoGift,
  IoHeadset,
  IoSettings,
  IoShieldCheckmark,
  IoStorefront,
} from "react-icons/io5";
import { FaTruck } from "react-icons/fa";

// Bangla wording sits next to each English title rather than in a
// translation file, so a menu entry and its translation are never edited
// apart. The sidebar picks one, the other, or both, per App language.
export const sidebarMenu = [
  {
    title: "Dashboard", bn: "ড্যাশবোর্ড",
    url: "/admin/dashboard",
    icon: IoHome,
    roles: ["admin"],
  },

  {
    title: "POS (Sales)", bn: "বিক্রয় (POS)",
    url: "/admin/pos",
    icon: IoCart,
    roles: ["admin", "cashier", "manager"],
  },

  {
    title: "Products", bn: "পণ্য",
    url: "#",
    icon: IoCube,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Products List", bn: "পণ্যের তালিকা", url: ADMIN_PRODUCT_SHOW, roles: ["admin", "manager"] },
      { title: "Add Products", bn: "পণ্য যোগ", url: ADMIN_PRODUCT_ADD, roles: ["admin"] },
      { title: "Product Variants", bn: "পণ্যের ভ্যারিয়েন্ট", url: ADMIN_PRODUCT__VARIANT_SHOW, roles: ["admin", "manager"] },
      { title: "Units", bn: "একক", url: ADMIN_UNIT_SHOW, roles: ["admin"] },
      { title: "Categories", bn: "ক্যাটাগরি", url: ADMIN_CATEGORY_SHOW, roles: ["admin"] },
      { title: "Sub Categories", bn: "সাব ক্যাটাগরি", url: "/admin/subcategory", roles: ["admin"] },
      { title: "Brands", bn: "ব্র্যান্ড", url: ADMIN_BRAND_SHOW, roles: ["admin"] },
      { title: "Colors", bn: "রং", url: ADMIN_PRODUCT_COLOR, roles: ["admin"] },
      { title: "Attributes", bn: "অ্যাট্রিবিউট", url: ADMIN_ATTRIBUTE_SHOW, roles: ["admin"] },
      { title: "Print Barcode/Label", bn: "বারকোড প্রিন্ট", url: "/admin/barcode", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Orders", bn: "অর্ডার",
    url: "#",
    icon: IoReceipt,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "POS Sales", bn: "POS বিক্রয়", url: "/admin/all-orders/pos-orders", roles: ["admin", "manager", "cashier"] },
      { title: "Online Orders", bn: "অনলাইন অর্ডার", url: "/admin/all-orders/new-order/new", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Dealer Orders", bn: "ডিলার অর্ডার",
    url: "/admin/partner-orders",
    icon: IoStorefront,
    roles: ["admin", "manager", "cashier"],
  },

  {
    title: "Warranty", bn: "ওয়ারেন্টি",
    url: "/admin/warranty",
    icon: IoShieldCheckmark,
    roles: ["admin", "manager", "cashier"],
  },

  {
    title: "Customers", bn: "ক্রেতা",
    url: "/admin/customers",
    icon: IoPerson,
    roles: ["admin"],
  },

  {
    title: "Suppliers", bn: "সরবরাহকারী",
    url: ADMIN_SUPPLIER_SHOW,
    icon: FaTruck,
    roles: ["admin"],
  },

  {
    title: "Purchase", bn: "ক্রয়",
    url: ADMIN_PURCHASE_SHOW,
    icon: IoDownload,
    roles: ["admin", "manager"],
  },

  {
    title: "Stock Management", bn: "স্টক ব্যবস্থাপনা",
    url: "#",
    icon: IoLayers,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "Stock Overview", bn: "স্টক পরিস্থিতি", url: "/admin/Stock-Overview", roles: ["admin", "manager", "cashier"] },
      { title: "Edit Stock", bn: "স্টক সংশোধন", url: "/admin/warehouse", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Expenses", bn: "খরচ",
    url: ADMIN_EXPENSE_SHOW,
    icon: IoWallet,
    roles: ["admin", "manager"],
  },

  {
    title: "Reports", bn: "রিপোর্ট",
    url: "#",
    icon: IoBarChart,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Sales Report", bn: "বিক্রয় রিপোর্ট", url: "/admin/dashboard/reports", roles: ["admin", "manager"] },
      { title: "Profit & Loss", bn: "লাভ ও ক্ষতি", url: ADMIN_REPORT_PROFIT_LOSS, roles: ["admin"] },
      { title: "Due Report", bn: "বাকির রিপোর্ট", url: ADMIN_REPORT_DUE, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Marketing", bn: "মার্কেটিং",
    url: "#",
    icon: IoMegaphone,
    roles: ["admin"],
    submenu: [
      { title: "Tracking / Pixel", bn: "ট্র্যাকিং / পিক্সেল", url: "/admin/tracking", roles: ["admin"] },
    ],
  },

  {
    title: "Website Settings", bn: "ওয়েবসাইট সেটিংস",
    url: "#",
    icon: IoGlobe,
    roles: ["admin"],
    submenu: [
      { title: "Slider / Banner", bn: "স্লাইডার / ব্যানার", url: "/admin/banner", roles: ["admin"] },
      { title: "Media", bn: "মিডিয়া", url: "/admin/media", roles: ["admin"] },
      { title: "Couriers", bn: "কুরিয়ার", url: "/admin/couriers", roles: ["admin"] },
    ],
  },

  {
    title: "App Settings", bn: "অ্যাপ সেটিংস",
    url: ADMIN_APP_SETTINGS,
    icon: IoPhonePortrait,
    roles: ["admin"],
  },

  {
    title: "Users", bn: "ব্যবহারকারী",
    url: "#",
    icon: IoPeople,
    roles: ["admin"],
    submenu: [
      { title: "Users", bn: "ব্যবহারকারী", url: "/admin/users", roles: ["admin"] },
      { title: "Create User", bn: "নতুন ব্যবহারকারী", url: "/admin/users/create", roles: ["admin"] },
      { title: "User Role", bn: "ব্যবহারকারীর ভূমিকা", url: "/admin/users/roles", roles: ["admin"] },
      { title: "Dealers & Wholesalers", bn: "ডিলার ও পাইকার", url: "/admin/partners", roles: ["admin"] },
    ],
  },

  {
    title: "Coupons & Offers", bn: "কুপন ও অফার",
    url: "#",
    icon: IoGift,
    roles: ["admin"],
    submenu: [
      { title: "All Coupons", bn: "সব কুপন", url: "/admin/coupon", roles: ["admin"] },
      { title: "Add Coupon", bn: "কুপন যোগ", url: ADMIN_COUPON_ADD, roles: ["admin"] },
    ],
  },

  {
    title: "Support Tickets", bn: "সাপোর্ট টিকিট",
    url: ADMIN_SUPPORT_TICKETS,
    icon: IoHeadset,
    roles: ["admin", "manager"],
  },

  {
    title: "System Settings", bn: "সিস্টেম সেটিংস",
    url: "#",
    icon: IoSettings,
    roles: ["admin"],
    submenu: [
      { title: "Trash", bn: "ট্র্যাশ", url: "/admin/trash", roles: ["admin"] },
      { title: "General", bn: "সাধারণ", url: ADMIN_SYSTEM_SETTINGS, roles: ["admin"] },
    ],
  },
];
