// Colored badge for a partner order status (shared by portal and admin)
const STYLES = {
  pending: ["Pending", "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"],
  confirmed: ["Confirmed", "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"],
  invoiced: ["Invoiced", "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"],
  cancelled: ["Cancelled", "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"],
};

export const ORDER_STATUS_LABELS = Object.fromEntries(
  Object.entries(STYLES).map(([k, [label]]) => [k, label]),
);

export function OrderStatus({ status }) {
  const [label, cls] = STYLES[status] || [status, "bg-gray-100 text-gray-600"];
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
