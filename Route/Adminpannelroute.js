export const ADMIN_DASHBOARD = "/admin/dashboard";

export const ADMIN_MEDIA_SHOW = "/admin/media";

export const ADMIN_MEDIA_EDIT = (id) => (id ? "admin/media/edit/${id}" : "");

export const ADMIN_CATEGORY_ADD = "/admin/category/add";

export const ADMIN_CATEGORY_SHOW = "/admin/category";

export const ADMIN_SUB_CATEGORY_ADD = "/admin/sub-category/add";

export const ADMIN_SUB_CATEGORY_SHOW = "/admin/sub-category";

export const ADMIN_CATEGORY_EDIT = (id) => `/admin/category/edit/${id}`;

// Trash route
export const ADMIN_TRASH = "/admin/trash";

// Product routes

export const ADMIN_PRODUCT_ADD = "/admin/product/add";
export const ADMIN_PRODUCT_SHOW = "/admin/product";
export const ADMIN_PRODUCT_EDIT = (id) =>
  id ? `/admin/product/edit/${id}` : "";

// Product Varient routes

export const ADMIN_PRODUCT_VARIANT_ADD = "/admin/product-variant/add";
export const ADMIN_PRODUCT__VARIANT_SHOW = "/admin/product-variant";
export const ADMIN_PRODUCT__VARIANT_EDIT = (id) =>
  id ? `/admin/product-variant/edit/${id}` : "";

// Coupon routes

export const ADMIN_COUPON_ADD = "/admin/coupon/add";
export const ADMIN_COUPON_SHOW = "/admin/coupon";
export const ADMIN_COUPON_EDIT = (id) => (id ? `/admin/coupon/edit/${id}` : "");

// Customer route
export const ADMIN_CUSTOMERS_SHOW = "/admin/customers";

export const ADMIN_ORDER_SHOW = "/admin/all-orders";
export const ADMIN_ORDER_DETAILS = (order_id) =>
  order_id ? `/admin/all-orders/details/${order_id}` : "";

export const ADMIN_ORDER_EDIT = (order_id) =>
  order_id ? `/admin/all-orders/edit/${order_id}` : "";
