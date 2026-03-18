import { ADMIN_CATEGORY_ADD, ADMIN_CATEGORY_SHOW, ADMIN_COUPON_ADD, ADMIN_MEDIA_EDIT, ADMIN_MEDIA_SHOW, ADMIN_PRODUCT__VARIANT_SHOW, ADMIN_PRODUCT_ADD, ADMIN_PRODUCT_EDIT, ADMIN_PRODUCT_SHOW, ADMIN_PRODUCT_VARIANT_ADD } from "@/Route/Adminpannelroute";
import {
  IoGridOutline,
  IoStorefrontOutline,
  IoCartOutline,
  IoPeopleOutline,
  IoCashOutline,
  IoReturnDownBackOutline,
  IoMegaphoneOutline,
  IoAlbumsOutline,
  IoChatbubblesOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
  IoShirtOutline,
} from "react-icons/io5";
import { BiCategory } from "react-icons/bi";


export const sidebarMenu = [
  // DASHBOARD
  {
    title: "Dashboard",
    url: "/admin",
    icon: IoGridOutline,
    submenu: [
      { title: "Overview", url: "/admin" },
      { title: "Analytics", url: "/admin/analytics" },
      { title: "Reports", url: "/admin/reports" },
    ],
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
      title: "All Category",
      url: ADMIN_CATEGORY_SHOW,
    }
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
      title: "Add Variant",
      url: ADMIN_PRODUCT_VARIANT_ADD
    },
    {
      title: "Product Variants",
      url: ADMIN_PRODUCT__VARIANT_SHOW
    },
    
  ]
},



  // ORDERS
  {
    title: "Orders",
    url: "/admin/all-orders",
    icon: IoCartOutline,
    submenu: [
      { title: "All Orders", url: "/admin/all-orders" },
      { title: "Pending", url: "/admin/orders?status=pending" },
      { title: "Processing", url: "/admin/orders?status=processing" },
      { title: "Shipped", url: "/admin/orders?status=shipped" },
      { title: "Delivered", url: "/admin/orders?status=delivered" },
      { title: "Cancelled", url: "/admin/orders?status=cancelled" },
      { title: "Returns / Refunds", url: "/admin/returns" },
      { title: "Abandoned Carts", url: "/admin/carts/abandoned" },
      { title: "Invoices", url: "/admin/invoices" },
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
      { title: "Support Tickets", url: "/admin/support/tickets" },
    ],
  },

  // PAYMENTS & FINANCE
  {
    title: "Payments",
    url: "/admin/payments",
    icon: IoCashOutline,
    submenu: [
      { title: "Transactions", url: "/admin/payments/transactions" },
      { title: "Payouts", url: "/admin/payments/payouts" },
      { title: "Refunds", url: "/admin/payments/refunds" },
      { title: "Payment Methods", url: "/admin/payments/methods" },
      { title: "Tax Settings", url: "/admin/taxes" },
    ],
  },

  // SHIPPING
  {
    title: "Shipping",
    url: "/admin/shipping",
    icon: IoReturnDownBackOutline,
    submenu: [
      { title: "Shipping Zones", url: "/admin/shipping/zones" },
      { title: "Rates", url: "/admin/shipping/rates" },
      { title: "Carriers", url: "/admin/shipping/carriers" },
      { title: "Pickup Points", url: "/admin/shipping/pickup" },
      { title: "Tracking", url: "/admin/shipping/tracking" },
    ],
  },

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
      { title: "SEO Pages", url: "/admin/seo" },
    ],
  },

  // CONTENT (CMS)
  {
    title: "Content",
    url: "/admin/content",
    icon: IoAlbumsOutline,
    submenu: [
      { title: "Pages", url: "/admin/pages" },
      { title: "Blogs", url: "/admin/blogs" },
      { title: "Menus", url: "/admin/menus" },
      { title: "Sliders", url: "/admin/sliders" },
      { title: "FAQ", url: "/admin/faq" },
      { title: "Policies", url: "/admin/policies" },
    ],
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

  // SETTINGS
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IoSettingsOutline,
    submenu: [
      { title: "Store Settings", url: "/admin/settings/store" },
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
