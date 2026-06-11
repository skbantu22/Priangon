// "use client";
// import React, { useState, useMemo } from "react";
// import {
//   Search,
//   ArrowUpDown,
//   ChevronLeft,
//   ChevronRight,
//   Plus,
//   Download,
//   Trash2,
//   MoreVertical,
//   Eye,
//   EyeOff,
//   CheckCircle,
//   Clock,
//   AlertCircle,
//   XCircle,
//   Calendar,
//   MapPin,
//   Mail,
//   Phone,
//   Package,
//   SlidersHorizontal,
//   RefreshCw,
//   X,
//   FileSpreadsheet,
//   FileJson,
//   ShoppingBag,
//   Truck,
//   ListFilter,
//   Send,
//   Check,
// } from "lucide-react";

// // ----------------- SUB-COMPONENTS -----------------

// // Toast Notification Manager UI
// function NotificationHUD({ notifications }) {
//   return (
//     <div className="fixed top-5 right-5 z-50 space-y-2 pointer-events-none">
//       {notifications.map((n) => (
//         <div
//           key={n.id}
//           className={`flex items-center gap-3 p-4 rounded-xl shadow-xl border text-sm font-semibold max-w-sm transition-all duration-300 transform translate-x-0 ${
//             n.type === "success"
//               ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-slate-800 dark:border-emerald-800 dark:text-emerald-400"
//               : n.type === "error"
//                 ? "bg-rose-50 border-rose-300 text-rose-800 dark:bg-slate-800 dark:border-rose-800 dark:text-rose-400"
//                 : "bg-blue-50 border-blue-300 text-blue-800 dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-400"
//           }`}
//         >
//           {n.type === "success" ? (
//             <CheckCircle className="w-5 h-5 text-emerald-600" />
//           ) : (
//             <AlertCircle className="w-5 h-5 text-rose-600" />
//           )}
//           <span className="flex-1">{n.message}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// // Click-Go Quick Status Filtering Tabs

// // Drawer filters expansion panel
// function AdvancedFilterPanel({
//   isOpen,
//   statusFilter,
//   setStatusFilter,
//   paymentFilter,
//   setPaymentFilter,
//   minPrice,
//   setMinPrice,
//   maxPrice,
//   setMaxPrice,
//   setCurrentPage,
//   addNotification,
//   filteredCount,
// }) {
//   if (!isOpen) return null;
//   return (
//     <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
//       <div>
//         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
//           Order Status
//         </label>
//         <select
//           value={statusFilter}
//           onChange={(e) => {
//             setStatusFilter(e.target.value);
//             setCurrentPage(1);
//           }}
//           className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
//         >
//           <option value="All">All Statuses</option>
//           <option value="Active">Active Fulfillments</option>
//           <option value="Delivered">Delivered</option>
//           <option value="Processing">Processing</option>
//           <option value="Shipped">Shipped</option>
//           <option value="Pending">Pending</option>
//           <option value="Cancelled">Cancelled</option>
//         </select>
//       </div>

//       <div>
//         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
//           Payment Method
//         </label>
//         <select
//           value={paymentFilter}
//           onChange={(e) => {
//             setPaymentFilter(e.target.value);
//             setCurrentPage(1);
//           }}
//           className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
//         >
//           <option value="All">All Methods</option>
//           <option value="Credit Card">Credit Card</option>
//           <option value="PayPal">PayPal</option>
//           <option value="Bank Transfer">Bank Transfer</option>
//           <option value="Apple Pay">Apple Pay</option>
//         </select>
//       </div>

//       <div>
//         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
//           Price Threshold (Min)
//         </label>
//         <div className="relative">
//           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
//             $
//           </span>
//           <input
//             type="number"
//             placeholder="Min"
//             value={minPrice}
//             onChange={(e) => {
//               setMinPrice(e.target.value);
//               setCurrentPage(1);
//             }}
//             className="w-full pl-7 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
//           />
//         </div>
//       </div>

//       <div>
//         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
//           Price Threshold (Max)
//         </label>
//         <div className="relative">
//           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
//             $
//           </span>
//           <input
//             type="number"
//             placeholder="Max"
//             value={maxPrice}
//             onChange={(e) => {
//               setMaxPrice(e.target.value);
//               setCurrentPage(1);
//             }}
//             className="w-full pl-7 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
//           />
//         </div>
//       </div>

//       <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
//         <span className="text-xs text-slate-400 font-semibold">
//           {filteredCount} matching parameters found
//         </span>
//         <button
//           onClick={() => {
//             setStatusFilter("All");
//             setPaymentFilter("All");
//             setMinPrice("");
//             setMaxPrice("");
//             addNotification("Filters cleared.", "info");
//           }}
//           className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold flex items-center gap-1"
//         >
//           Reset all Filters
//         </button>
//       </div>
//     </div>
//   );
// }

// // Bulk action interactive banner HUD
// function BulkActionsPanel({
//   selectedOrders,
//   triggerCourierModal,
//   handleSetStatus,
//   handleDeleteOrders,
//   setSelectedOrders,
// }) {
//   if (selectedOrders.length === 0) return null;
//   return (
//     <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900 flex flex-col md:flex-row md:items-center justify-between px-6 gap-3 animate-fade-in">
//       <div className="flex items-center gap-3">
//         <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-widest bg-indigo-200/50 dark:bg-indigo-900/50 px-2 py-1 rounded">
//           {selectedOrders.length} SELECTED
//         </span>
//         <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hidden lg:block">
//           Perform operations across multiple checkout files simultaneously
//         </p>
//       </div>

//       <div className="flex flex-wrap items-center gap-2">
//         <button
//           onClick={() => triggerCourierModal(selectedOrders)}
//           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
//           title="Dispatch selected orders directly to courier integration"
//         >
//           <Truck className="w-3.5 h-3.5" />
//           <span>Send to Courier</span>
//         </button>

//         <button
//           onClick={() => handleSetStatus(selectedOrders, "Pending")}
//           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-slate-900 dark:border-rose-900 dark:text-rose-400 rounded-lg shadow-sm transition-all"
//         >
//           <Clock className="w-3.5 h-3.5" />
//           <span>Set Pending</span>
//         </button>

//         <button
//           onClick={() => handleSetStatus(selectedOrders, "Shipped")}
//           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-slate-900 dark:border-amber-900 dark:text-amber-400 rounded-lg shadow-sm transition-all"
//         >
//           <Send className="w-3.5 h-3.5" />
//           <span>Set Shipped</span>
//         </button>

//         <button
//           onClick={() => handleDeleteOrders(selectedOrders)}
//           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-all"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//           <span>Delete Selected</span>
//         </button>

//         <button
//           onClick={() => setSelectedOrders([])}
//           className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 ml-1"
//         >
//           <X className="w-4 h-4" />
//         </button>
//       </div>
//     </div>
//   );
// }

// // ----------------- MAIN APP COMPONENT -----------------

// export default function App() {
//   const [orders, setOrders] = useState(MOCK_ORDERS);
//   const [selectedOrders, setSelectedOrders] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [statusFilter, setStatusFilter] = useState("All");
//   const [paymentFilter, setPaymentFilter] = useState("All");
//   const [minPrice, setMinPrice] = useState("");
//   const [maxPrice, setMaxPrice] = useState("");
//   const [sortBy, setSortBy] = useState({ field: "date", direction: "desc" });
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(5);

//   // View States
//   const [showCustomerColumn, setShowCustomerColumn] = useState(false);
//   const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

//   // Courier States
//   const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
//   const [courierTargets, setCourierTargets] = useState([]);
//   const [selectedCarrier, setSelectedCarrier] = useState("UPS");

//   // Toast notifications state
//   const [notifications, setNotifications] = useState([]);

//   // Form state for creating a new order
//   const [newOrder, setNewOrder] = useState({
//     customerName: "",
//     customerEmail: "",
//     customerPhone: "",
//     status: "Pending",
//     itemName: "",
//     itemPrice: "",
//     itemQty: 1,
//     paymentMethod: "Credit Card",
//     shippingAddress: "",
//     carrier: "UPS",
//   });

//   const addNotification = (message, type = "success") => {
//     const id = Date.now();
//     setNotifications((prev) => [...prev, { id, message, type }]);
//     setTimeout(() => {
//       setNotifications((prev) => prev.filter((n) => n.id !== id));
//     }, 4500);
//   };

//   const handleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedOrders(filteredOrders.map((o) => o.id));
//     } else {
//       setSelectedOrders([]);
//     }
//   };

//   const handleSelectRow = (id) => {
//     if (selectedOrders.includes(id)) {
//       setSelectedOrders((prev) => prev.filter((item) => item !== id));
//     } else {
//       setSelectedOrders((prev) => [...prev, id]);
//     }
//   };

//   const handleSetStatus = (ids, targetStatus) => {
//     setOrders((prev) =>
//       prev.map((order) =>
//         ids.includes(order.id) ? { ...order, status: targetStatus } : order,
//       ),
//     );
//     addNotification(
//       `Successfully updated ${ids.length} order(s) to ${targetStatus}.`,
//       "success",
//     );
//     setSelectedOrders([]);
//   };

//   const handleDeleteOrders = (ids) => {
//     setOrders((prev) => prev.filter((order) => !ids.includes(order.id)));
//     addNotification(
//       `Successfully deleted ${ids.length} order file(s).`,
//       "error",
//     );
//     setSelectedOrders([]);
//   };

//   const triggerCourierModal = (ids) => {
//     setCourierTargets(ids);
//     setIsCourierModalOpen(true);
//   };

//   const handleConfirmCourierDispatch = () => {
//     if (courierTargets.length === 0) return;

//     setOrders((prev) =>
//       prev.map((order) => {
//         if (courierTargets.includes(order.id)) {
//           const trackingNum = `${selectedCarrier.substring(0, 2).toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}-US`;
//           return {
//             ...order,
//             status: "Shipped",
//             shipping: {
//               ...order.shipping,
//               carrier: selectedCarrier,
//               trackingNumber: trackingNum,
//               status: "In Transit",
//             },
//           };
//         }
//         return order;
//       }),
//     );

//     addNotification(
//       `Dispatched ${courierTargets.length} order(s) to ${selectedCarrier}! Tracking numbers generated.`,
//       "success",
//     );
//     setIsCourierModalOpen(false);
//     setSelectedOrders([]);
//     setCourierTargets([]);
//   };

//   const handleSort = (field) => {
//     const direction =
//       sortBy.field === field && sortBy.direction === "asc" ? "desc" : "asc";
//     setSortBy({ field, direction });
//   };

//   const filteredOrders = useMemo(() => {
//     return orders
//       .filter((order) => {
//         // Search matching
//         const matchesSearch =
//           order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
//           order.customer.name
//             .toLowerCase()
//             .includes(searchQuery.toLowerCase()) ||
//           order.customer.email
//             .toLowerCase()
//             .includes(searchQuery.toLowerCase()) ||
//           order.items.some((i) =>
//             i.name.toLowerCase().includes(searchQuery.toLowerCase()),
//           );

//         // Status matching (Dynamic support for active status custom filter)
//         let matchesStatus = false;
//         if (statusFilter === "All") {
//           matchesStatus = true;
//         } else if (statusFilter === "Active") {
//           matchesStatus =
//             order.status === "Processing" || order.status === "Shipped";
//         } else {
//           matchesStatus = order.status === statusFilter;
//         }

//         // Payment matching
//         const matchesPayment =
//           paymentFilter === "All" || order.payment.method === paymentFilter;

//         // Price range matching
//         const val = order.total;
//         const matchesMin = minPrice === "" || val >= parseFloat(minPrice);
//         const matchesMax = maxPrice === "" || val <= parseFloat(maxPrice);

//         return (
//           matchesSearch &&
//           matchesStatus &&
//           matchesPayment &&
//           matchesMin &&
//           matchesMax
//         );
//       })
//       .sort((a, b) => {
//         let aVal, bVal;

//         if (sortBy.field === "id") {
//           aVal = a.id;
//           bVal = b.id;
//         } else if (sortBy.field === "customer") {
//           aVal = a.customer.name;
//           bVal = b.customer.name;
//         } else if (sortBy.field === "date") {
//           aVal = a.date;
//           bVal = b.date;
//         } else if (sortBy.field === "status") {
//           aVal = a.status;
//           bVal = b.status;
//         } else if (sortBy.field === "total") {
//           aVal = a.total;
//           bVal = b.total;
//         }

//         if (aVal < bVal) return sortBy.direction === "asc" ? -1 : 1;
//         if (aVal > bVal) return sortBy.direction === "asc" ? 1 : -1;
//         return 0;
//       });
//   }, [
//     orders,
//     searchQuery,
//     statusFilter,
//     paymentFilter,
//     minPrice,
//     maxPrice,
//     sortBy,
//   ]);

//   const paginatedOrders = useMemo(() => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
//   }, [filteredOrders, currentPage, itemsPerPage]);

//   const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

//   const stats = useMemo(() => {
//     const totalRev = orders.reduce(
//       (sum, o) => (o.status !== "Cancelled" ? sum + o.total : sum),
//       0,
//     );
//     const active = orders.filter(
//       (o) => o.status === "Processing" || o.status === "Shipped",
//     ).length;
//     const completed = orders.filter((o) => o.status === "Delivered").length;
//     const pending = orders.filter((o) => o.status === "Pending").length;
//     return { totalRev, active, completed, pending, totalCount: orders.length };
//   }, [orders]);

//   // Compute status counts for live quick-pill indicators
//   const statusCounts = useMemo(() => {
//     const counts = {
//       All: orders.length,
//       Pending: 0,
//       Processing: 0,
//       Shipped: 0,
//       Delivered: 0,
//       Cancelled: 0,
//       Active: 0,
//     };
//     orders.forEach((o) => {
//       if (counts[o.status] !== undefined) {
//         counts[o.status]++;
//       }
//       if (o.status === "Processing" || o.status === "Shipped") {
//         counts.Active++;
//       }
//     });
//     return counts;
//   }, [orders]);

//   const handleCreateOrder = (e) => {
//     e.preventDefault();
//     if (
//       !newOrder.customerName ||
//       !newOrder.itemName ||
//       !newOrder.itemPrice ||
//       !newOrder.shippingAddress
//     ) {
//       addNotification("Please fill in all required fields", "error");
//       return;
//     }

//     const calculatedTotal =
//       parseFloat(newOrder.itemPrice) * parseInt(newOrder.itemQty);
//     const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
//     const createdOrder = {
//       id: orderId,
//       customer: {
//         name: newOrder.customerName,
//         email:
//           newOrder.customerEmail ||
//           `${newOrder.customerName.toLowerCase().replace(/\s+/g, "")}@example.com`,
//         phone: newOrder.customerPhone || "+1 (555) 000-0000",
//         avatar:
//           "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80",
//       },
//       date: new Date().toISOString().split("T")[0],
//       status: newOrder.status,
//       total: calculatedTotal,
//       items: [
//         {
//           name: newOrder.itemName,
//           quantity: parseInt(newOrder.itemQty),
//           price: parseFloat(newOrder.itemPrice),
//         },
//       ],
//       payment: {
//         method: newOrder.paymentMethod,
//         status:
//           newOrder.status === "Delivered" ||
//           newOrder.status === "Shipped" ||
//           newOrder.status === "Processing"
//             ? "Paid"
//             : "Awaiting",
//         transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
//       },
//       shipping: {
//         address: newOrder.shippingAddress,
//         carrier: newOrder.carrier || "None",
//         trackingNumber:
//           newOrder.status === "Shipped"
//             ? `UPS-${Math.floor(10000 + Math.random() * 90000)}-US`
//             : "Unassigned",
//         status:
//           newOrder.status === "Delivered"
//             ? "Delivered"
//             : newOrder.status === "Shipped"
//               ? "In Transit"
//               : "Label Pending",
//       },
//     };

//     setOrders([createdOrder, ...orders]);
//     setIsCreateModalOpen(false);
//     addNotification(`Successfully created order ${orderId}!`, "success");
//     setNewOrder({
//       customerName: "",
//       customerEmail: "",
//       customerPhone: "",
//       status: "Pending",
//       itemName: "",
//       itemPrice: "",
//       itemQty: 1,
//       paymentMethod: "Credit Card",
//       shippingAddress: "",
//       carrier: "UPS",
//     });
//   };

//   const exportData = (format) => {
//     let content = "";
//     const name = `orders-export-${new Date().toISOString().split("T")[0]}`;

//     if (format === "json") {
//       content = JSON.stringify(filteredOrders, null, 2);
//       const blob = new Blob([content], { type: "application/json" });
//       const url = URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `${name}.json`;
//       link.click();
//       addNotification("Exported filtered orders as JSON file.", "success");
//     } else {
//       const headers = [
//         "Order ID",
//         "Customer Name",
//         "Email",
//         "Date",
//         "Status",
//         "Total Amount",
//         "Items Count",
//         "Payment Method",
//       ];
//       const rows = filteredOrders.map((o) => [
//         o.id,
//         o.customer.name,
//         o.customer.email,
//         o.date,
//         o.status,
//         o.total.toFixed(2),
//         o.items.reduce((acc, curr) => acc + curr.quantity, 0),
//         o.payment.method,
//       ]);
//       content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
//       const blob = new Blob([content], { type: "text/csv" });
//       const url = URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `${name}.csv`;
//       link.click();
//       addNotification(
//         "Exported filtered orders as CSV spreadsheet.",
//         "success",
//       );
//     }
//   };

//   return (

//   );
// }
