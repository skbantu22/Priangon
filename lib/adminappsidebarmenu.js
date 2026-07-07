import {
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_SHOW,
  ADMIN_COUPON_ADD,
  ADMIN_MEDIA_EDIT,
  ADMIN_MEDIA_SHOW,
  ADMIN_PRODUCT__VARIANT_SHOW,
  ADMIN_PRODUCT_ADD,
  ADMIN_PRODUCT_COLOR,
  ADMIN_PRODUCT_EDIT,
  ADMIN_PRODUCT_SHOW,
  ADMIN_PRODUCT_VARIANT_ADD,
} from "@/Route/Adminpannelroute";
import {
  IoGridOutline,
  IoStorefrontOutline,
  IoCartOutline,
  IoPeopleOutline,
  IoCashOutline,
  IoReturnDownBackOutline,
  IoMegaphoneOutline,
  IoAlbumsOutline,
  IoBusinessOutline,
  IoChatbubblesOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
  IoShirtOutline,
} from "react-icons/io5";
import { BiCategory } from "react-icons/bi";

export const sidebarMenu = [
  {
    title: "POS",
    url: "/admin/pos",
    icon: IoGridOutline,
  },

  // SHOWROOM
  {
    title: "Stock Overview",
    url: "/admin/Stock-Overview",
    icon: IoBusinessOutline,
  },

  // DASHBOARD
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IoGridOutline,
    submenu: [{ title: "Reports", url: "/admin/dashboard/reports" }],
  },

  // CATALOG
  {
    title: "Category",
    url: "#",
    icon: BiCategory,
    submenu: [
      {
        title: "Add Category",
        url: ADMIN_CATEGORY_ADD,
      },

      {
        title: "Add Category",
        url: ADMIN_CATEGORY_ADD,
      },
      {
        title: "All Category",
        url: ADMIN_CATEGORY_SHOW,
      },
    ],
  },

  {
    title: "Products",
    url: "#",
    icon: IoShirtOutline,
    submenu: [
      {
        title: "Add Product",
        url: ADMIN_PRODUCT_ADD,
      },

      {
        title: "All Products",
        url: ADMIN_PRODUCT_SHOW,
      },
      {
        title: "Add Product Variant",
        url: ADMIN_PRODUCT_VARIANT_ADD,
      },
      {
        title: "All Products Variants",
        url: ADMIN_PRODUCT__VARIANT_SHOW,
      },

      {
        title: "Color",
        url: ADMIN_PRODUCT_COLOR,
      },
    ],
  },

  // ORDERS
  {
    title: "Orders",
    url: "/admin/all-orders",
    icon: IoCartOutline,
    submenu: [
      { title: "All Orders", url: "/admin/all-orders//new-order/new" },
      { title: "Moderators Orders", url: "/admin/all-orders/moderator" },

      { title: "POS Orders", url: "/admin/all-orders/pos-orders" },

      // { title: "Invoices", url: "/admin/invoices" },
    ],
  },

  // CUSTOMERS
  {
    title: "Customers",
    url: "/admin/customers",
    icon: IoPeopleOutline,
    submenu: [
      { title: "All Customers", url: "/admin/customers" },
      { title: "Customer Groups", url: "/admin/customers/groups" },
      { title: "Addresses", url: "/admin/customers/addresses" },
      { title: "Wishlists", url: "/admin/customers/wishlists" },
      // { title: "Support Tickets", url: "/admin/support/tickets" },
    ],
  },

  // // PAYMENTS & FINANCE
  // {
  //   title: "Payments",
  //   url: "/admin/payments",
  //   icon: IoCashOutline,
  //   submenu: [
  //     { title: "Transactions", url: "/admin/payments/transactions" },
  //     { title: "Payouts", url: "/admin/payments/payouts" },
  //     { title: "Refunds", url: "/admin/payments/refunds" },
  //     { title: "Payment Methods", url: "/admin/payments/methods" },
  //     { title: "Tax Settings", url: "/admin/taxes" },
  //   ],
  // },

  // SHIPPING
  // {
  //   title: "Shipping",
  //   url: "/admin/shipping",
  //   icon: IoReturnDownBackOutline,
  //   submenu: [
  //     { title: "Shipping Zones", url: "/admin/shipping/zones" },
  //     { title: "Rates", url: "/admin/shipping/rates" },
  //     { title: "Carriers", url: "/admin/shipping/carriers" },
  //     { title: "Pickup Points", url: "/admin/shipping/pickup" },
  //     { title: "Tracking", url: "/admin/shipping/tracking" },
  //   ],
  // },

  // MARKETING (COUPON ADDED HERE ✅)
  {
    title: "Marketing",
    url: "/admin/marketing",
    icon: IoMegaphoneOutline,
    submenu: [
      { title: "Add Coupon", url: ADMIN_COUPON_ADD },
      { title: "All Coupons", url: ADMIN_CATEGORY_SHOW },
      { title: "Discount Rules", url: "/admin/discounts" },
      { title: "Promotions / Banners", url: "/admin/promotions" },
      { title: "Email Campaigns", url: "/admin/marketing/email" },
      { title: "SMS / WhatsApp", url: "/admin/marketing/sms" },
    ],
  },

  // CONTENT (CMS)
  {
    title: "Media",
    url: "/admin/content",
    icon: IoAlbumsOutline,
    submenu: [{ title: "Upload Media", url: "/admin/media" }],
  },

  // COMMUNICATION
  {
    title: "Messages",
    url: "/admin/messages",
    icon: IoChatbubblesOutline,
    submenu: [
      { title: "Live Chat", url: "/admin/chat" },
      { title: "Email Inbox", url: "/admin/messages/email" },
      { title: "Notifications", url: "/admin/notifications" },
      { title: "Announcements", url: "/admin/announcements" },
    ],
  },

  // REPORTS
  {
    title: "Reports",
    url: "/admin/reports",
    icon: IoStatsChartOutline,
    submenu: [
      { title: "Sales Report", url: "/admin/reports/sales" },
      { title: "Product Performance", url: "/admin/reports/products" },
      { title: "Customer Insights", url: "/admin/reports/customers" },
      { title: "Inventory Report", url: "/admin/reports/inventory" },
    ],
  },

  // SHOWROOM
  {
    title: "Showroom",
    url: "/admin/showroom",
    icon: IoBusinessOutline,
    submenu: [
      { title: "Transfer Stock", url: "/admin/products-confirm" },

      { title: "POS Checkout", url: "/admin/pos" },

      { title: "Showroom List", url: "/admin/showrooms" },

      { title: "Barcode Print", url: "/admin/barcode" },

      { title: "Stock Overview", url: "/admin/Stock-Overview" },

      { title: "Stock Transfer", url: "/admin/showroom/stock-transfer" },

      { title: "Confirm Products", url: "/admin/select-products" },

      { title: "Create Showroom", url: "/admin/showrooms" },

      { title: "Showroom Stock Edit", url: "/admin/warehouse" },
    ],
  },

  // SETTINGS
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IoSettingsOutline,
    submenu: [
      { title: "Slider Settings", url: "/admin/banner" },
      { title: "Staff / Roles", url: "/admin/settings/staff" },
      { title: "Permissions", url: "/admin/settings/permissions" },
      { title: "Payment Settings", url: "/admin/settings/payments" },
      { title: "Shipping Settings", url: "/admin/settings/shipping" },
      { title: "Tax Settings", url: "/admin/settings/taxes" },
      { title: "Integrations", url: "/admin/settings/integrations" },
      { title: "Security", url: "/admin/settings/security" },
      { title: "Audit Logs", url: "/admin/settings/audit-logs" },
    ],
  },
];
