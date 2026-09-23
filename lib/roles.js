// Every login role, what it is for and where it lands after login.
// Shared by the Role List page and its API.
export const ROLES = [
  {
    key: "admin",
    name: "Admin",
    group: "Staff",
    access: "Everything: dashboard, POS, products, stock, reports, users and settings",
    home: "/admin/dashboard",
  },
  {
    key: "manager",
    name: "Manager",
    group: "Staff",
    access: "POS, products, stock, orders, warranty and reports",
    home: "/admin/pos",
  },
  {
    key: "cashier",
    name: "Cashier",
    group: "Staff",
    access: "POS sales, exchanges and warranty check",
    home: "/admin/pos",
  },
  {
    key: "dealer",
    name: "Dealer (ডিলার)",
    group: "Partner",
    access: "Partner portal: dealer price list, stock, place orders, own invoices and due",
    home: "/partner",
  },
  {
    key: "subDealer",
    name: "Sub Dealer (সাব ডিলার)",
    group: "Partner",
    access: "Partner portal: sub dealer price list, stock, place orders, own invoices and due",
    home: "/partner",
  },
  {
    key: "retailer",
    name: "Retailer (রিটেইলার)",
    group: "Partner",
    access: "Partner portal: retailer price list, stock, place orders, own invoices and due",
    home: "/partner",
  },
  {
    key: "customer",
    name: "Customer",
    group: "Customer",
    access: "Own account only",
    home: "/my-account",
  },
];
