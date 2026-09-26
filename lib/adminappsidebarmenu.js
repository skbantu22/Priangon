import {
  ADMIN_APP_SETTINGS,
  ADMIN_ATTRIBUTE_SHOW,
  ADMIN_BRAND_SHOW,
  ADMIN_CATEGORY_SHOW,
  ADMIN_CUSTOMER_ADVANCE,
  ADMIN_CUSTOMER_DUE_DISMISS,
  ADMIN_CUSTOMER_DUE_PAID,
  ADMIN_CUSTOMER_DUE_RECEIVED,
  ADMIN_CUSTOMERS_SHOW,
  ADMIN_ASSET_SHOW,
  ADMIN_ASSET_TYPE,
  ADMIN_EMPLOYEE_ADD,
  ADMIN_EMPLOYEE_COMMISSION_PAYMENTS,
  ADMIN_EMPLOYEE_COMMISSIONS,
  ADMIN_EMPLOYEE_SALARY,
  ADMIN_EMPLOYEES,
  ADMIN_EXPENSE_ADD,
  ADMIN_EXPENSE_SHOW,
  ADMIN_EXPENSE_TYPE,
  ADMIN_INVENTORY_ADJUSTMENTS,
  ADMIN_INVENTORY_STOCK,
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
  ADMIN_SALE_RETURNS,
  ADMIN_SALES,
  ADMIN_SALES_OF,
  ADMIN_REPORT_DUE,
  ADMIN_REPORTS,
  ADMIN_REPORT_PROFIT_LOSS,
  ADMIN_SUPPLIER_DUE_DISMISS,
  ADMIN_SUPPLIER_DUE_PAID,
  ADMIN_SUPPLIER_DUE_RECEIVED,
  ADMIN_SUPPLIER_SCHEDULE,
  ADMIN_SUPPLIER_SHOW,
  ADMIN_UNIT_SHOW,
} from "@/Route/Adminpannelroute";
import {
  IoHome,
  IoCart,
  IoCube,
  IoPerson,
  IoDownload,
  IoLayers,
  IoWallet,
  IoBarChart,
  IoPhonePortrait,
  IoPeople,
  IoSettings,
  IoShieldCheckmark,
  IoStorefront,
  IoBriefcase,
  IoIdCard,
  IoReceipt,
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
    title: "Sales", bn: "বিক্রয়",
    url: "#",
    icon: IoReceipt,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "Sale List", bn: "বিক্রয়ের তালিকা", url: ADMIN_SALES, roles: ["admin", "manager", "cashier"] },
      { title: "Buyer / Retail Sales", bn: "খুচরা বিক্রয়", url: ADMIN_SALES_OF("retail"), roles: ["admin", "manager", "cashier"] },
      { title: "Dealer Sales", bn: "ডিলার বিক্রয়", url: ADMIN_SALES_OF("dealer"), roles: ["admin", "manager", "cashier"] },
      { title: "Sub Dealer Sales", bn: "সাব ডিলার বিক্রয়", url: ADMIN_SALES_OF("subDealer"), roles: ["admin", "manager", "cashier"] },
      { title: "Wholesaler Sales", bn: "পাইকার বিক্রয়", url: ADMIN_SALES_OF("wholesaler"), roles: ["admin", "manager", "cashier"] },
      { title: "Exchange List", bn: "এক্সচেঞ্জ তালিকা", url: ADMIN_SALES_OF("exchange"), roles: ["admin", "manager", "cashier"] },
      { title: "Sales Return List", bn: "বিক্রয় ফেরত তালিকা", url: ADMIN_SALE_RETURNS, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Products", bn: "পণ্য",
    url: "#",
    icon: IoCube,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Products List", bn: "পণ্যের তালিকা", url: ADMIN_PRODUCT_SHOW, roles: ["admin", "manager"] },
      { title: "Add Products", bn: "পণ্য যোগ", url: ADMIN_PRODUCT_ADD, roles: ["admin"] },
      { title: "Units", bn: "একক", url: ADMIN_UNIT_SHOW, roles: ["admin"] },
      { title: "Categories", bn: "ক্যাটাগরি", url: ADMIN_CATEGORY_SHOW, roles: ["admin"] },
      { title: "Sub Categories", bn: "সাব ক্যাটাগরি", url: "/admin/subcategory", roles: ["admin"] },
      { title: "Brands", bn: "ব্র্যান্ড", url: ADMIN_BRAND_SHOW, roles: ["admin"] },
      { title: "Colors", bn: "রং", url: `${ADMIN_ATTRIBUTE_SHOW}?slot=color`, roles: ["admin"] },
      { title: "Attributes (Storage / Size)", bn: "স্টোরেজ / সাইজ", url: `${ADMIN_ATTRIBUTE_SHOW}?slot=size`, roles: ["admin"] },
      { title: "Print Barcode/Label", bn: "বারকোড প্রিন্ট", url: "/admin/barcode", roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Dealer / Wholesaler Orders", bn: "ডিলার / পাইকার অর্ডার",
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
    url: "#",
    icon: IoPerson,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Customer List", bn: "ক্রেতার তালিকা", url: ADMIN_CUSTOMERS_SHOW, roles: ["admin", "manager"] },
      { title: "Due Received List", bn: "বাকি গ্রহণের তালিকা", url: ADMIN_CUSTOMER_DUE_RECEIVED, roles: ["admin", "manager"] },
      { title: "Customer Due Paid List", bn: "ক্রেতার বাকি পরিশোধ", url: ADMIN_CUSTOMER_DUE_PAID, roles: ["admin", "manager"] },
      { title: "Customer Due Dismiss List", bn: "ক্রেতার বাকি মওকুফ", url: ADMIN_CUSTOMER_DUE_DISMISS, roles: ["admin", "manager"] },
      { title: "Customer Advance List", bn: "ক্রেতার অগ্রিম", url: ADMIN_CUSTOMER_ADVANCE, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Suppliers", bn: "সরবরাহকারী",
    url: "#",
    icon: FaTruck,
    roles: ["admin"],
    submenu: [
      { title: "Suppliers List", bn: "সরবরাহকারীর তালিকা", url: ADMIN_SUPPLIER_SHOW, roles: ["admin"] },
      { title: "Supplier Schedule", bn: "সরবরাহকারীর সময়সূচি", url: ADMIN_SUPPLIER_SCHEDULE, roles: ["admin"] },
      { title: "Due Received List", bn: "বাকি গ্রহণের তালিকা", url: ADMIN_SUPPLIER_DUE_RECEIVED, roles: ["admin"] },
      { title: "Suppliers Due Paid List", bn: "বাকি পরিশোধের তালিকা", url: ADMIN_SUPPLIER_DUE_PAID, roles: ["admin"] },
      { title: "Suppliers Due Dismiss List", bn: "বাকি মওকুফের তালিকা", url: ADMIN_SUPPLIER_DUE_DISMISS, roles: ["admin"] },
    ],
  },

  {
    title: "Purchases", bn: "ক্রয়",
    url: "#",
    icon: IoDownload,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Add Purchase", bn: "ক্রয় যোগ", url: ADMIN_PURCHASE_ADD, roles: ["admin", "manager"] },
      { title: "Manage Purchase", bn: "ক্রয়ের তালিকা", url: ADMIN_PURCHASE_SHOW, roles: ["admin", "manager"] },
      { title: "Add Purchase Order", bn: "ক্রয় অর্ডার যোগ", url: ADMIN_PURCHASE_ORDER_ADD, roles: ["admin", "manager"] },
      { title: "Manage Purchase Orders", bn: "ক্রয় অর্ডারের তালিকা", url: ADMIN_PURCHASE_ORDER_SHOW, roles: ["admin", "manager"] },
      { title: "Purchase Return", bn: "ক্রয় ফেরত", url: ADMIN_PURCHASE_RETURN_ADD, roles: ["admin", "manager"] },
      { title: "Purchases Return List", bn: "ক্রয় ফেরতের তালিকা", url: ADMIN_PURCHASE_RETURN_SHOW, roles: ["admin", "manager"] },
      { title: "Returnable", bn: "ফেরতযোগ্য", url: ADMIN_PURCHASE_RETURNABLE, roles: ["admin", "manager"] },
      { title: "Purchases Return Type", bn: "ফেরতের ধরন", url: ADMIN_PURCHASE_RETURN_TYPES, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Inventory", bn: "ইনভেন্টরি",
    url: "#",
    icon: IoLayers,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      { title: "Stock", bn: "স্টক", url: ADMIN_INVENTORY_STOCK, roles: ["admin", "manager", "cashier"] },
      { title: "Adjustments", bn: "স্টক সমন্বয়", url: ADMIN_INVENTORY_ADJUSTMENTS, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Employees", bn: "কর্মচারী",
    url: "#",
    icon: IoIdCard,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Employee List", bn: "কর্মচারীর তালিকা", url: ADMIN_EMPLOYEES, roles: ["admin", "manager"] },
      { title: "Add New Employee", bn: "নতুন কর্মচারী", url: ADMIN_EMPLOYEE_ADD, roles: ["admin"] },
      { title: "All Paid Salary", bn: "বেতন", url: ADMIN_EMPLOYEE_SALARY, roles: ["admin"] },
      { title: "Sales Commissions", bn: "বিক্রয় কমিশন", url: ADMIN_EMPLOYEE_COMMISSIONS, roles: ["admin"] },
      { title: "Commission Payments", bn: "কমিশন পরিশোধ", url: ADMIN_EMPLOYEE_COMMISSION_PAYMENTS, roles: ["admin"] },
    ],
  },

  {
    title: "Expenses", bn: "খরচ",
    url: "#",
    icon: IoWallet,
    roles: ["admin", "manager"],
    submenu: [
      { title: "New Expense", bn: "নতুন খরচ", url: ADMIN_EXPENSE_ADD, roles: ["admin", "manager"] },
      { title: "Expense List", bn: "খরচের তালিকা", url: ADMIN_EXPENSE_SHOW, roles: ["admin", "manager"] },
      { title: "Expense Type", bn: "খরচের ধরন", url: ADMIN_EXPENSE_TYPE, roles: ["admin", "manager"] },
    ],
  },

  {
    title: "Assets", bn: "সম্পদ",
    url: "#",
    icon: IoBriefcase,
    roles: ["admin", "manager"],
    submenu: [
      { title: "Asset List", bn: "সম্পদের তালিকা", url: ADMIN_ASSET_SHOW, roles: ["admin", "manager"] },
      { title: "Asset Type", bn: "সম্পদের ধরন", url: ADMIN_ASSET_TYPE, roles: ["admin"] },
    ],
  },

  {
    title: "Reports", bn: "রিপোর্ট",
    url: "#",
    icon: IoBarChart,
    roles: ["admin", "manager"],
    submenu: [
      { title: "All Reports", bn: "সব রিপোর্ট", url: ADMIN_REPORTS, roles: ["admin", "manager"] },
      { title: "Sales Report", bn: "বিক্রয় রিপোর্ট", url: ADMIN_REPORT("master-sales-report"), roles: ["admin", "manager"] },
      { title: "Daily Sales Report", bn: "দৈনিক বিক্রয় রিপোর্ট", url: ADMIN_REPORT("daily-sales-report"), roles: ["admin", "manager"] },
      { title: "Dealer Sales Report", bn: "ডিলার বিক্রয় রিপোর্ট", url: ADMIN_REPORT("dealer-sales-report"), roles: ["admin", "manager"] },
      { title: "Sub Dealer Sales Report", bn: "সাব ডিলার বিক্রয় রিপোর্ট", url: ADMIN_REPORT("sub-dealer-sales-report"), roles: ["admin", "manager"] },
      { title: "Wholesaler Sales Report", bn: "পাইকার বিক্রয় রিপোর্ট", url: ADMIN_REPORT("wholesaler-sales-report"), roles: ["admin", "manager"] },
      { title: "Profit & Loss", bn: "লাভ ও ক্ষতি", url: ADMIN_REPORT_PROFIT_LOSS, roles: ["admin"] },
      { title: "Due Report", bn: "বাকির রিপোর্ট", url: ADMIN_REPORT_DUE, roles: ["admin", "manager"] },
      { title: "Summary", bn: "সারসংক্ষেপ", url: ADMIN_REPORT("summary"), roles: ["admin"] },
      { title: "Sales Dashboard", bn: "বিক্রয় ড্যাশবোর্ড", url: "/admin/dashboard/reports", roles: ["admin", "manager"] },
    ],
  },


  {
    title: "Settings", bn: "সেটিংস",
    url: "#",
    icon: IoPhonePortrait,
    roles: ["admin"],
    submenu: [
      { title: "Business Settings", bn: "ব্যবসার সেটিংস", url: ADMIN_APP_SETTINGS, roles: ["admin"] },
      { title: "Print Settings", bn: "প্রিন্ট সেটিংস", url: "/admin/settings/print", roles: ["admin"] },
      { title: "VAT Settings", bn: "ভ্যাট সেটিংস", url: "/admin/settings/vat", roles: ["admin"] },
    ],
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
      { title: "Dealers, Sub Dealers & Wholesalers", bn: "ডিলার, সাব ডিলার ও পাইকার", url: "/admin/partners", roles: ["admin"] },
    ],
  },

  {
    title: "System Settings", bn: "সিস্টেম সেটিংস",
    url: "#",
    icon: IoSettings,
    roles: ["admin"],
    submenu: [
      { title: "Activity Log", bn: "কার্যক্রমের লগ", url: "/admin/activity-log", roles: ["admin"] },
      { title: "Trash", bn: "ট্র্যাশ", url: "/admin/trash", roles: ["admin"] },
    ],
  },
];
