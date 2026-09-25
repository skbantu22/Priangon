import {
  ADMIN_APP_SETTINGS,
  ADMIN_ATTRIBUTE_SHOW,
  ADMIN_BRAND_SHOW,
  ADMIN_CATEGORY_SHOW,
  ADMIN_COUPON_ADD,
  ADMIN_CUSTOMER_ADVANCE,
  ADMIN_CUSTOMER_DUE_DISMISS,
  ADMIN_CUSTOMER_DUE_PAID,
  ADMIN_CUSTOMER_DUE_RECEIVED,
  ADMIN_CUSTOMERS_SHOW,
  ADMIN_ASSET_SHOW,
  ADMIN_ASSET_TYPE,
  ADMIN_EXPENSE_ADD,
  ADMIN_EXPENSE_SHOW,
  ADMIN_EXPENSE_TYPE,
  ADMIN_INVENTORY_ADJUSTMENTS,
  ADMIN_INVENTORY_RECEIVED,
  ADMIN_INVENTORY_STOCK,
  ADMIN_INVENTORY_TRANSFER,
  ADMIN_INVENTORY_TRANSFERRED,
  ADMIN_PRODUCT_ADD,
  ADMIN_PRODUCT_SHOW,
  ADMIN_PURCHASE_ADD,
  ADMIN_PURCHASE_ORDER_ADD,
  ADMIN_PURCHASE_ORDER_SHOW,
  ADMIN_PURCHASE_RETURN_ADD,
  ADMIN_PURCHASE_RETURN_SHOW,
  ADMIN_PURCHASE_RETURN_TYPES,
  ADMIN_PURCHASE_RETURNABLE,
  ADMIN_PURCHASE_SHOW,
  ADMIN_REPORT,
  ADMIN_REPORT_DUE,
  ADMIN_REPORTS,
  ADMIN_REPORT_PROFIT_LOSS,
  ADMIN_SUPPLIER_DUE_DISMISS,
  ADMIN_SUPPLIER_DUE_PAID,
  ADMIN_SUPPLIER_DUE_RECEIVED,
  ADMIN_SUPPLIER_SCHEDULE,
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
  IoBriefcase,
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
      { title: "Units", url: ADMIN_UNIT_SHOW, roles: ["admin"] },
      { title: "Categories", url: ADMIN_CATEGORY_SHOW, roles: ["admin"] },
      { title: "Sub Categories", url: "/admin/subcategory", roles: ["admin"] },
      { title: "Brands", url: ADMIN_BRAND_SHOW, roles: ["admin"] },
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
    url: "#",
    icon: IoPerson,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Customer List", url: ADMIN_CUSTOMERS_SHOW, roles: ["admin", "manager"] },
      { title: "Due Received List", url: ADMIN_CUSTOMER_DUE_RECEIVED, roles: ["admin", "manager"] },
      { title: "Customer Due Paid List", url: ADMIN_CUSTOMER_DUE_PAID, roles: ["admin", "manager"] },
      { title: "Customer Due Dismiss List", url: ADMIN_CUSTOMER_DUE_DISMISS, roles: ["admin", "manager"] },
      { title: "Customer Advance List", url: ADMIN_CUSTOMER_ADVANCE, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Suppliers",
    url: "#",
    icon: FaTruck,
    roles: ["admin"],
    submenu: [
      { title: "Suppliers List", url: ADMIN_SUPPLIER_SHOW, roles: ["admin"] },
      { title: "Supplier Schedule", url: ADMIN_SUPPLIER_SCHEDULE, roles: ["admin"] },
      { title: "Due Received List", url: ADMIN_SUPPLIER_DUE_RECEIVED, roles: ["admin"] },
      { title: "Suppliers Due Paid List", url: ADMIN_SUPPLIER_DUE_PAID, roles: ["admin"] },
      { title: "Suppliers Due Dismiss List", url: ADMIN_SUPPLIER_DUE_DISMISS, roles: ["admin"] },
    ],
  },

  {
    title: "Purchases",
    url: "#",
    icon: IoDownload,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Add Purchase", url: ADMIN_PURCHASE_ADD, roles: ["admin", "manager"] },
      { title: "Manage Purchase", url: ADMIN_PURCHASE_SHOW, roles: ["admin", "manager"] },
      { title: "Add Purchase Order", url: ADMIN_PURCHASE_ORDER_ADD, roles: ["admin", "manager"] },
      { title: "Manage Purchase Orders", url: ADMIN_PURCHASE_ORDER_SHOW, roles: ["admin", "manager"] },
      { title: "Purchase Return", url: ADMIN_PURCHASE_RETURN_ADD, roles: ["admin", "manager"] },
      { title: "Purchases Return List", url: ADMIN_PURCHASE_RETURN_SHOW, roles: ["admin", "manager"] },
      { title: "Returnable", url: ADMIN_PURCHASE_RETURNABLE, roles: ["admin", "manager"] },
      { title: "Purchases Return Type", url: ADMIN_PURCHASE_RETURN_TYPES, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Inventory",
    url: "#",
    icon: IoLayers,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "Stock", url: ADMIN_INVENTORY_STOCK, roles: ["admin", "manager", "cashier"] },
      { title: "Adjustments", url: ADMIN_INVENTORY_ADJUSTMENTS, roles: ["admin", "manager"] },
      { title: "Transfer", url: ADMIN_INVENTORY_TRANSFER, roles: ["admin", "manager"] },
      { title: "Transferred List", url: ADMIN_INVENTORY_TRANSFERRED, roles: ["admin", "manager", "cashier"] },
      { title: "Received List", url: ADMIN_INVENTORY_RECEIVED, roles: ["admin", "manager", "cashier"] },
    ],
  },

  {
    title: "Expenses",
    url: "#",
    icon: IoWallet,
    roles: ["admin", "manager"],
    submenu: [
      { title: "New Expense", url: ADMIN_EXPENSE_ADD, roles: ["admin", "manager"] },
      { title: "Expense List", url: ADMIN_EXPENSE_SHOW, roles: ["admin", "manager"] },
      { title: "Expense Type", url: ADMIN_EXPENSE_TYPE, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Assets",
    url: "#",
    icon: IoBriefcase,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Asset List", url: ADMIN_ASSET_SHOW, roles: ["admin", "manager"] },
      { title: "Asset Type", url: ADMIN_ASSET_TYPE, roles: ["admin"] },
    ],
  },

  {
    title: "Reports",
    url: "#",
    icon: IoBarChart,
    roles: ["admin", "manager"],
    submenu: [
      { title: "All Reports", url: ADMIN_REPORTS, roles: ["admin", "manager"] },
      { title: "Sales Report", url: ADMIN_REPORT("master-sales-report"), roles: ["admin", "manager"] },
      { title: "Daily Sales Report", url: ADMIN_REPORT("daily-sales-report"), roles: ["admin", "manager"] },
      { title: "Dealer Sales Report", url: ADMIN_REPORT("dealer-sales-report"), roles: ["admin", "manager"] },
      { title: "Sub Dealer Sales Report", url: ADMIN_REPORT("sub-dealer-sales-report"), roles: ["admin", "manager"] },
      { title: "Wholesaler Sales Report", url: ADMIN_REPORT("wholesaler-sales-report"), roles: ["admin", "manager"] },
      { title: "Profit & Loss", url: ADMIN_REPORT_PROFIT_LOSS, roles: ["admin"] },
      { title: "Due Report", url: ADMIN_REPORT_DUE, roles: ["admin", "manager"] },
      { title: "Summary", url: ADMIN_REPORT("summary"), roles: ["admin"] },
      { title: "Sales Dashboard", url: "/admin/dashboard/reports", roles: ["admin", "manager"] },
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
      { title: "Users", url: "/admin/users", roles: ["admin"] },
      { title: "Create User", url: "/admin/users/create", roles: ["admin"] },
      { title: "User Role", url: "/admin/users/roles", roles: ["admin"] },
      { title: "Dealers & Wholesalers", url: "/admin/partners", roles: ["admin"] },
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
