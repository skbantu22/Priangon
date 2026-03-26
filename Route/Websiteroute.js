import { response } from "@/lib/helperfunction";

export const WEBSITE_HOME = "/";
export const WEBSITE_LOGIN = "/auth/login";
export const WEBSITE_REGISTER = "/auth/register";

export const WEBSITE_RESETPASSWORD = "/auth/reset-password";

export const WEBSITE_USER_DASHBOARD = "/my-account";

export const WEBSITE_SHOP = "/shop";
export const WEBSITE_CART = "/cart";

export const WEBSITE_PRODUCT_DETAILS = (slug) =>
  slug ? `/product/${slug}` : "/product";

// User routes
export const USER_DASHBOARD = "/my-account";
export const USER_PROFILE = "/profile";
export const USER_ORDER = "/orders";
export const USER_WISHLIST = "/wishlist";
export const WEBSITE_ORDER_DETAILS = (order_id) => `/order-details/${order_id}`;

export const WEBSITE_ORDERS_DETAILS = (order_id) =>
  `/order/success?id=${response.orderId}`;

export const WEBSITE_TERMS_AND_CONDITION = "/terms-and-condision";

export const USER_TRACK_ORDER = "/track-order";
