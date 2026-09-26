/**
 * What a role is allowed to do.
 *
 * Every key here answers to something this app actually has — a page, an
 * API route, a button. A permission that guards nothing is worse than no
 * permission at all, because it reads as protection and is not.
 *
 * Keys are "<module>.<action>" and never change once shipped; a role
 * stores the keys, so renaming one would silently drop an allowance.
 */

export const PERMISSION_GROUPS = [
  {
    key: "dashboard",
    label: "Dashboard",
    permissions: [
      ["dashboard.view", "Open the dashboard"],
      ["dashboard.allBranches", "See every showroom, not just their own"],
    ],
  },
  {
    key: "pos",
    label: "POS (Sales)",
    permissions: [
      ["pos.sell", "Make a sale"],
      ["pos.exchange", "Take an exchange / trade-in"],
      ["pos.discount", "Give a discount on a sale"],
      ["pos.due", "Sell on due (বাকি)"],
      ["pos.reprint", "Reprint an invoice"],
    ],
  },
  {
    key: "products",
    label: "Products",
    permissions: [
      ["products.view", "See the product list"],
      ["products.create", "Add a product"],
      ["products.edit", "Edit a product"],
      ["products.delete", "Delete a product"],
      ["products.import", "Import products from a file"],
      ["products.cost", "See the purchase price"],
      ["variants.view", "See product variants"],
      ["variants.manage", "Add, edit and delete variants"],
      ["barcode.print", "Print barcodes and labels"],
    ],
  },
  {
    key: "catalog",
    label: "Catalogue",
    permissions: [
      ["categories.view", "See categories"],
      ["categories.manage", "Add, edit and delete categories"],
      ["brands.view", "See brands"],
      ["brands.manage", "Add, edit and delete brands"],
      ["units.view", "See units"],
      ["units.manage", "Add, edit and delete units"],
      ["attributes.view", "See attributes"],
      ["attributes.manage", "Add, edit and delete attributes"],
      ["colors.manage", "Manage the colour library"],
    ],
  },
  {
    key: "orders",
    label: "Orders",
    permissions: [
      ["orders.view", "See orders"],
      ["orders.edit", "Edit an order"],
      ["orders.delete", "Delete an order"],
      ["orders.export", "Export orders"],
      ["partnerOrders.view", "See dealer, sub dealer and wholesaler orders"],
      ["partnerOrders.invoice", "Confirm, cancel and invoice those orders"],
    ],
  },
  {
    key: "warranty",
    label: "Warranty",
    permissions: [
      ["warranty.view", "See warranty claims"],
      ["warranty.create", "Open a warranty claim"],
      ["warranty.update", "Update a claim's status"],
    ],
  },
  {
    key: "customers",
    label: "Customers",
    permissions: [
      ["customers.view", "See customers"],
      ["customers.create", "Add a customer"],
      ["customers.edit", "Edit a customer"],
      ["customers.delete", "Delete a customer"],
      ["customers.due", "See what customers owe"],
      ["customers.payment", "Take a due payment, advance or dismiss from a customer"],
    ],
  },
  {
    key: "suppliers",
    label: "Suppliers",
    permissions: [
      ["suppliers.view", "See suppliers"],
      ["suppliers.manage", "Add, edit and delete suppliers"],
    ],
  },
  {
    key: "purchase",
    label: "Purchase",
    permissions: [
      ["purchase.view", "See purchases"],
      ["purchase.create", "Create a purchase"],
      ["purchase.receive", "Receive goods into stock"],
      ["purchase.payment", "Pay a supplier"],
      ["purchase.cancel", "Cancel a purchase"],
      ["purchase.order", "Write, edit and cancel purchase orders"],
      ["purchase.return", "Return goods to a supplier"],
    ],
  },
  {
    key: "employees",
    label: "Employees",
    permissions: [
      ["employees.view", "See employees"],
      ["employees.manage", "Add, edit and delete employees"],
      ["employees.salary", "Pay and delete salary"],
      ["employees.commission", "Give and pay commission"],
    ],
  },
  {
    key: "stock",
    label: "Stock",
    permissions: [
      ["stock.view", "See stock"],
      ["stock.adjust", "Correct a stock figure"],
      ["stock.transfer", "Move stock between warehouse and showroom"],
      ["stock.history", "See the stock movement history"],
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    permissions: [
      ["expenses.view", "See expenses"],
      ["expenses.create", "Record an expense"],
      ["expenses.edit", "Edit an expense"],
      ["expenses.delete", "Delete an expense"],
      ["expenses.categories", "Manage expense categories"],
    ],
  },
  {
    key: "assets",
    label: "Assets",
    permissions: [
      ["assets.view", "See assets"],
      ["assets.create", "Record an asset"],
      ["assets.edit", "Edit an asset"],
      ["assets.delete", "Delete an asset"],
      ["assets.types", "Manage asset types"],
    ],
  },
  {
    key: "reports",
    label: "Reports",
    permissions: [
      ["reports.sales", "Sales report"],
      ["reports.due", "Due report"],
      ["reports.profitLoss", "Profit & loss"],
      ["reports.inventory", "Stock report"],
    ],
  },
  {
    key: "coupons",
    label: "Coupons & Offers",
    permissions: [
      ["coupons.view", "See coupons"],
      ["coupons.manage", "Add, edit and delete coupons"],
    ],
  },
  {
    key: "support",
    label: "Support",
    permissions: [
      ["support.view", "See support tickets"],
      ["support.reply", "Reply to a ticket"],
      ["support.manage", "Change status, priority and assignment"],
    ],
  },
  {
    key: "website",
    label: "Website",
    permissions: [
      ["website.banner", "Manage the slider and banners"],
      ["website.media", "Manage the media library"],
      ["website.couriers", "Manage couriers"],
      ["website.tracking", "Manage tracking and pixel settings"],
    ],
  },
  {
    key: "users",
    label: "Users & Roles",
    permissions: [
      ["users.view", "See users"],
      ["users.create", "Add a user"],
      ["users.edit", "Edit a user"],
      ["users.delete", "Delete a user"],
      ["users.roles", "Create and edit roles"],
      ["activity.view", "See the activity log (who changed what)"],
      ["partners.manage", "Manage dealer and wholesaler logins"],
    ],
  },
  {
    key: "settings",
    label: "Settings",
    permissions: [
      ["settings.view", "See settings"],
      ["settings.app", "Change app settings, VAT and invoice"],
      ["settings.system", "Change system settings"],
      ["showrooms.manage", "Manage showrooms"],
      ["trash.view", "Open the trash"],
      ["trash.restore", "Restore or permanently delete"],
    ],
  },
];

/** Every key, flat — what a role's list is validated against */
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map(([key]) => key),
);

export const PERMISSION_COUNT = ALL_PERMISSIONS.length;

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

/** Drops anything unknown, so a stale key cannot grant access later */
export const cleanPermissions = (list) => [
  ...new Set(
    (Array.isArray(list) ? list : []).filter((key) => PERMISSION_SET.has(key)),
  ),
];

export const permissionLabel = (key) => {
  for (const group of PERMISSION_GROUPS) {
    for (const [permission, label] of group.permissions) {
      if (permission === key) return label;
    }
  }

  return key;
};

/**
 * The roles that ship with the app. They cannot be deleted, because a
 * login with no role can do nothing at all.
 *
 * "admin" holds every permission and keeps holding new ones as they are
 * added — the owner should never be locked out of a feature they just
 * installed.
 */
export const SYSTEM_ROLES = {
  admin: {
    name: "Admin",
    description: "Everything, including users, roles and settings",
    permissions: "*",
  },
  manager: {
    name: "Manager",
    description: "Runs the shop day to day, without settings or users",
    permissions: [
      "dashboard.view",
      "pos.sell", "pos.exchange", "pos.discount", "pos.due", "pos.reprint",
      "products.view", "products.create", "products.edit", "products.cost",
      "variants.view", "variants.manage", "barcode.print",
      "categories.view", "categories.manage",
      "brands.view", "units.view", "attributes.view",
      "orders.view", "orders.edit", "orders.export",
      "partnerOrders.view", "partnerOrders.invoice",
      "warranty.view", "warranty.create", "warranty.update",
      "customers.view", "customers.create", "customers.edit", "customers.due", "customers.payment",
      "suppliers.view",
      "purchase.view", "purchase.create", "purchase.receive", "purchase.payment",
      "purchase.order", "purchase.return",
      "employees.view",
      "stock.view", "stock.adjust", "stock.transfer", "stock.history",
      "expenses.view", "expenses.create", "expenses.edit",
      "assets.view", "assets.create", "assets.edit",
      "reports.sales", "reports.due", "reports.inventory",
      "coupons.view",
      "support.view", "support.reply", "support.manage",
      "settings.view",
    ],
  },
  cashier: {
    name: "Cashier",
    description: "The counter: sells, exchanges and checks warranty",
    permissions: [
      "pos.sell", "pos.exchange", "pos.reprint",
      "products.view", "variants.view",
      "orders.view",
      "partnerOrders.view", "partnerOrders.invoice",
      "warranty.view", "warranty.create",
      "customers.view", "customers.create",
      "stock.view",
    ],
  },
};
