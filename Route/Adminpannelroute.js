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

export const ADMIN_PRODUCT_COLOR = "/admin/product/color";

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
export const ADMIN_CUSTOMER_DUE_RECEIVED = "/admin/customers/due-received";
export const ADMIN_CUSTOMER_DUE_PAID = "/admin/customers/due-paid";
export const ADMIN_CUSTOMER_DUE_DISMISS = "/admin/customers/due-dismiss";
export const ADMIN_CUSTOMER_ADVANCE = "/admin/customers/advance";
export const ADMIN_CUSTOMER_LEDGER = (id) => `/admin/customers/${id}/ledger`;
export const ADMIN_CUSTOMER_PAYMENT = (id, type) =>
  `/admin/customers/${id}/payment/${type}`;
export const ADMIN_CUSTOMERS_EDIT = (id) =>
  id ? `/admin/customers/edit/${id}` : "";

export const ADMIN_ORDER_SHOW = "/admin/all-orders";
export const ADMIN_ORDER_DETAILS = (order_id) =>
  order_id ? `/admin/all-orders/details/${order_id}` : "";

export const ADMIN_ORDER_EDIT = (order_id) =>
  order_id ? `/admin/all-orders/edit/${order_id}` : "";

// Brand routes
export const ADMIN_BRAND_SHOW = "/admin/brand";

// Unit routes
export const ADMIN_UNIT_SHOW = "/admin/unit";

// Supplier routes
export const ADMIN_SUPPLIER_SHOW = "/admin/supplier";
export const ADMIN_SUPPLIER_SCHEDULE = "/admin/supplier/schedule";
export const ADMIN_SUPPLIER_DUE_RECEIVED = "/admin/supplier/due-received";
export const ADMIN_SUPPLIER_DUE_PAID = "/admin/supplier/due-paid";
export const ADMIN_SUPPLIER_DUE_DISMISS = "/admin/supplier/due-dismiss";
export const ADMIN_SUPPLIER_LEDGER = (id) => `/admin/supplier/${id}/ledger`;
export const ADMIN_SUPPLIER_PAYMENT = (id, type) =>
  `/admin/supplier/${id}/payment/${type}`;

// Purchase routes
export const ADMIN_PURCHASE_SHOW = "/admin/purchase";
export const ADMIN_PURCHASE_ADD = "/admin/purchase/add";
export const ADMIN_PURCHASE_VIEW = (id) => `/admin/purchase/${id}`;
export const ADMIN_PURCHASE_ORDER_SHOW = "/admin/purchase/order";
export const ADMIN_PURCHASE_ORDER_ADD = "/admin/purchase/order/add";
export const ADMIN_PURCHASE_ORDER_EDIT = (id) => `/admin/purchase/order/edit/${id}`;
export const ADMIN_PURCHASE_ORDER_VIEW = (id) => `/admin/purchase/order/${id}`;
export const ADMIN_PURCHASE_RETURN_SHOW = "/admin/purchase/return";
export const ADMIN_PURCHASE_RETURN_ADD = "/admin/purchase/return/add";
export const ADMIN_PURCHASE_RETURN_VIEW = (id) => `/admin/purchase/return/${id}`;
export const ADMIN_PURCHASE_RETURNABLE = "/admin/purchase/returnable";
export const ADMIN_PURCHASE_RETURN_TYPES = "/admin/purchase/return-types";

// Expense routes
export const ADMIN_SALES = "/admin/sales";
export const ADMIN_SALES_OF = (type) => `/admin/sales?type=${type}`;
export const ADMIN_SALE_RETURN_ADD = (id) => `/admin/sales/${id}/return`;
export const ADMIN_SALE_RETURNS = "/admin/sales/returns";

export const ADMIN_EMPLOYEES = "/admin/employees";
export const ADMIN_EMPLOYEE_ADD = "/admin/employees/add";
export const ADMIN_EMPLOYEE_EDIT = (id) => `/admin/employees/edit/${id}`;
export const ADMIN_EMPLOYEE_SALARY = "/admin/employees/salary";
export const ADMIN_EMPLOYEE_COMMISSIONS = "/admin/employees/commissions";
export const ADMIN_EMPLOYEE_COMMISSION_PAYMENTS = "/admin/employees/commission-payments";

export const ADMIN_EXPENSE_SHOW = "/admin/expenses";
export const ADMIN_EXPENSE_ADD = "/admin/expenses/add";
export const ADMIN_EXPENSE_EDIT = (id) => `/admin/expenses/edit/${id}`;
export const ADMIN_EXPENSE_TYPE = "/admin/expenses/types";

// Asset routes
export const ADMIN_ASSET_SHOW = "/admin/assets";
export const ADMIN_ASSET_TYPE = "/admin/assets/types";

// Report routes
export const ADMIN_REPORTS = "/admin/reports";
export const ADMIN_REPORT = (key) => `/admin/reports/${key}`;
export const ADMIN_REPORT_DUE = "/admin/reports/due";
export const ADMIN_REPORT_PROFIT_LOSS = "/admin/reports/profit-loss";

// Settings routes
export const ADMIN_APP_SETTINGS = "/admin/settings";
export const ADMIN_SYSTEM_SETTINGS = "/admin/settings/system";

// Support routes
export const ADMIN_SUPPORT_TICKETS = "/admin/support-tickets";

// Attribute routes
export const ADMIN_ATTRIBUTE_SHOW = "/admin/attributes";

// Users & role routes
export const ADMIN_USERS = "/admin/users";
export const ADMIN_USER_CREATE = "/admin/users/create";
export const ADMIN_ROLES = "/admin/users/roles";
export const ADMIN_ROLE_MANAGE = (id) =>
  id ? `/admin/users/roles/manage?id=${id}` : "/admin/users/roles/manage";

// Inventory routes
export const ADMIN_INVENTORY_STOCK = "/admin/inventory/stock";
export const ADMIN_INVENTORY_ADJUSTMENTS = "/admin/inventory/adjustments";
export const ADMIN_INVENTORY_TRANSFER = "/admin/inventory/transfer";
export const ADMIN_INVENTORY_TRANSFERRED = "/admin/inventory/transferred";
export const ADMIN_INVENTORY_RECEIVED = "/admin/inventory/received";
