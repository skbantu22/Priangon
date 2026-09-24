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

export const sidebarMenu = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IoHome,
    roles: ["admin"],
  },

  {
    title: "POS (Sales)",
    url: "/admin/pos",
    icon: IoCart,
    roles: ["admin", "cashier", "manager"],
  },

  {
    title: "Products",
    url: "#",
    icon: IoCube,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Products List", url: ADMIN_PRODUCT_SHOW, roles: ["admin", "manager"] },
      { title: "Add Products", url: ADMIN_PRODUCT_ADD, roles: ["admin"] },
      { title: "Product Variants", url: ADMIN_PRODUCT__VARIANT_SHOW, roles: ["admin", "manager"] },
      { title: "Units", url: ADMIN_UNIT_SHOW, roles: ["admin"] },
      { title: "Categories", url: ADMIN_CATEGORY_SHOW, roles: ["admin"] },
      { title: "Sub Categories", url: "/admin/subcategory", roles: ["admin"] },
      { title: "Brands", url: ADMIN_BRAND_SHOW, roles: ["admin"] },
      { title: "Colors", url: ADMIN_PRODUCT_COLOR, roles: ["admin"] },
      { title: "Attributes", url: ADMIN_ATTRIBUTE_SHOW, roles: ["admin"] },
      { title: "Print Barcode/Label", url: "/admin/barcode", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Orders",
    url: "#",
    icon: IoReceipt,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "POS Sales", url: "/admin/all-orders/pos-orders", roles: ["admin", "manager", "cashier"] },
      { title: "Online Orders", url: "/admin/all-orders/new-order/new", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Dealer Orders",
    url: "/admin/partner-orders",
    icon: IoStorefront,
    roles: ["admin", "manager", "cashier"],
  },

  {
    title: "Warranty",
    url: "/admin/warranty",
    icon: IoShieldCheckmark,
    roles: ["admin", "manager", "cashier"],
  },

  {
    title: "Customers",
    url: "/admin/customers",
    icon: IoPerson,
    roles: ["admin"],
  },

  {
    title: "Suppliers",
    url: ADMIN_SUPPLIER_SHOW,
    icon: FaTruck,
    roles: ["admin"],
  },

  {
    title: "Purchase",
    url: ADMIN_PURCHASE_SHOW,
    icon: IoDownload,
    roles: ["admin", "manager"],
  },

  {
    title: "Stock Management",
    url: "#",
    icon: IoLayers,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "Stock Overview", url: "/admin/Stock-Overview", roles: ["admin", "manager", "cashier"] },
      { title: "Edit Stock", url: "/admin/warehouse", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Expenses",
    url: ADMIN_EXPENSE_SHOW,
    icon: IoWallet,
    roles: ["admin", "manager"],
  },

  {
    title: "Reports",
    url: "#",
    icon: IoBarChart,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Sales Report", url: "/admin/dashboard/reports", roles: ["admin", "manager"] },
      { title: "Profit & Loss", url: ADMIN_REPORT_PROFIT_LOSS, roles: ["admin"] },
      { title: "Due Report", url: ADMIN_REPORT_DUE, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Marketing",
    url: "#",
    icon: IoMegaphone,
    roles: ["admin"],
    submenu: [
      { title: "Tracking / Pixel", url: "/admin/tracking", roles: ["admin"] },
    ],
  },

  {
    title: "Website Settings",
    url: "#",
    icon: IoGlobe,
    roles: ["admin"],
    submenu: [
      { title: "Slider / Banner", url: "/admin/banner", roles: ["admin"] },
      { title: "Media", url: "/admin/media", roles: ["admin"] },
      { title: "Couriers", url: "/admin/couriers", roles: ["admin"] },
    ],
  },

  {
    title: "App Settings",
    url: ADMIN_APP_SETTINGS,
    icon: IoPhonePortrait,
    roles: ["admin"],
  },

  {
    title: "Users",
    url: "#",
    icon: IoPeople,
    roles: ["admin"],
    submenu: [
      { title: "Create User", url: "/admin/users", roles: ["admin"] },
      { title: "User Role", url: "/admin/users/roles", roles: ["admin"] },
      { title: "Dealers & Retailers", url: "/admin/partners", roles: ["admin"] },
    ],
  },

  {
    title: "Coupons & Offers",
    url: "#",
    icon: IoGift,
    roles: ["admin"],
    submenu: [
      { title: "All Coupons", url: "/admin/coupon", roles: ["admin"] },
      { title: "Add Coupon", url: ADMIN_COUPON_ADD, roles: ["admin"] },
    ],
  },

  {
    title: "Support Tickets",
    url: ADMIN_SUPPORT_TICKETS,
    icon: IoHeadset,
    roles: ["admin", "manager"],
  },

  {
    title: "System Settings",
    url: "#",
    icon: IoSettings,
    roles: ["admin"],
    submenu: [
      { title: "Trash", url: "/admin/trash", roles: ["admin"] },
      { title: "General", url: ADMIN_SYSTEM_SETTINGS, roles: ["admin"] },
    ],
  },
];
