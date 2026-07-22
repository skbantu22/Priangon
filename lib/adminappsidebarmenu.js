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
    roles: ["admin", "cashier", "manager"],
  },

  {
    title: "Stock Overview",
    url: "/stock-check",
    icon: IoBusinessOutline,
    roles: ["admin", "manager", "cashier"],
  },

  {
    title: "Dashboard",
    url: "/admin/all-orders/pos-orders",
    icon: IoGridOutline,
    roles: ["admin", "cashier"],
  },

  {
    title: "Main Dashboard",
    url: "/admin/dashboard",
    icon: IoGridOutline,
    roles: ["admin"],
    submenu: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        roles: ["admin"],
      },

      {
        title: "Report",
        url: "/admin/dashboard/reports",
        roles: ["admin"],
      },

      {
        title: "Online Orders",
        url: "/admin/all-orders/online-orders/all-online-req-order",
        roles: ["admin"],
      },
    ],
  },

  {
    title: "Category",
    url: "#",
    icon: BiCategory,
    roles: ["admin"],
    submenu: [
      {
        title: "Add Category",
        url: ADMIN_CATEGORY_ADD,
        roles: ["admin"],
      },
      {
        title: "All Category",
        url: ADMIN_CATEGORY_SHOW,
        roles: ["admin"],
      },
    ],
  },

  {
    title: "Products",
    url: "#",
    icon: IoShirtOutline,
    roles: ["admin", "manager"],
    submenu: [
      {
        title: "Add Product",
        url: ADMIN_PRODUCT_ADD,
        roles: ["admin"],
      },
      {
        title: "All Products",
        url: ADMIN_PRODUCT_SHOW,
        roles: ["admin", "manager"],
      },
      {
        title: "Add Product Variant",
        url: ADMIN_PRODUCT_VARIANT_ADD,
        roles: ["admin"],
      },
      {
        title: "All Products Variants",
        url: ADMIN_PRODUCT__VARIANT_SHOW,
        roles: ["admin", "manager"],
      },
      {
        title: "Color",
        url: ADMIN_PRODUCT_COLOR,
        roles: ["admin"],
      },
    ],
  },

  {
    title: "Orders",
    url: "/admin/all-orders",
    icon: IoCartOutline,
    roles: ["admin", "manager", "moderator"],
    submenu: [
      {
        title: "All Orders",
        url: "/admin/all-orders/new-order/new",
        roles: ["admin", "manager"],
      },
      {
        title: "Moderators Orders",
        url: "/admin/all-orders/moderator",
        roles: ["admin", "moderator"],
      },
    ],
  },

  {
    title: "Customers",
    url: "/admin/customers",
    icon: IoPeopleOutline,
    roles: ["admin"],
    submenu: [
      {
        title: "All Customers",
        url: "/admin/customers",
        roles: ["admin"],
      },
    ],
  },

  {
    title: "Marketing",
    url: "/admin/marketing",
    icon: IoMegaphoneOutline,
    roles: ["admin"],
    submenu: [
      {
        title: "Add Coupon",
        url: ADMIN_COUPON_ADD,
        roles: ["admin"],
      },
    ],
  },

  {
    title: "Messages",
    url: "/admin/messages",
    icon: IoChatbubblesOutline,
    roles: ["admin", "manager"],
    submenu: [
      {
        title: "Live Chat",
        url: "/admin/chat",
        roles: ["admin", "manager"],
      },
    ],
  },

  {
    title: "Reports",
    url: "/admin/reports",
    icon: IoStatsChartOutline,
    roles: ["admin", "manager"],
    submenu: [
      {
        title: "Sales Report",
        url: "/admin/reports/sales",
        roles: ["admin", "manager"],
      },
    ],
  },

  {
    title: "Showroom",
    url: "/admin/showroom",
    icon: IoBusinessOutline,
    roles: ["admin", "manager", "cashier"],
    submenu: [
      {
        title: "Transfer Stock",
        url: "/admin/products-confirm",
        roles: ["admin"],
      },
      {
        title: "POS Checkout",
        url: "/admin/pos",
        roles: ["admin", "manager", "cashier"],
      },
      {
        title: "Showroom List",
        url: "/admin/showrooms",
        roles: ["admin", "manager"],
      },
      {
        title: "Barcode Print",
        url: "/admin/barcode",
        roles: ["admin", "manager", "cashier"],
      },
      {
        title: "Stock Overview",
        url: "/admin/Stock-Overview",
        roles: ["admin", "manager", "cashier"],
      },
      {
        title: "Online Orders",
        url: "/admin/all-orders/online-orders",
        roles: ["admin", "manager", "cashier"],
      },

      {
        title: "Edit Stock ",
        url: "/admin/warehouse",
        roles: ["admin", "manager"],
      },
    ],
  },

  {
    title: "Settings",
    url: "/admin/settings",
    icon: IoSettingsOutline,
    roles: ["admin"],
    submenu: [
      {
        title: "Slider Settings",
        url: "/admin/banner",
        roles: ["admin"],
      },
    ],
  },
];
