"use client";

import { react, useState, useMemo, useEffect } from "react";
import {
  Package,
  Truck,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Download,
  MapPin,
  User,
  CreditCard,
  X,
  Plus,
  Trash2,
  FileText,
  RefreshCcw,
  Calendar,
  Box,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Layers,
  Save,
  ChevronLeft,
} from "lucide-react";

const OrderDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Edit State (Temporary storage for changes before saving)
  const [editFormData, setEditFormData] = useState(null);

  // New Order Form State
  const [newOrder, setNewOrder] = useState({
    customer: "",
    email: "",
    address: "",
    items: [{ name: "", price: 0, qty: 1 }],
  });

  // Mock Data
  const [orders, setOrders] = useState([
    {
      id: "#ORD-7742",
      customer: "Sarah Jenkins",
      date: "2023-10-24 14:30",
      status: "Processing",
      paymentMethod: "Visa **** 4242",
      subtotal: 110.0,
      tax: 9.5,
      shipping: 5.0,
      total: 124.5,
      items: [{ name: "Wireless Headphones Pro", price: 110.0, qty: 1 }],
      courier: null,
      tracking: null,
      address: "123 Maple St, Springfield, IL",
      email: "sarah.j@example.com",
      timeline: [
        { status: "Order Placed", time: "Oct 24, 14:30", done: true },
        { status: "Payment Confirmed", time: "Oct 24, 14:35", done: true },
        { status: "Processing", time: "Oct 24, 15:00", done: false },
      ],
    },
    {
      id: "#ORD-7741",
      customer: "Michael Chen",
      date: "2023-10-24 12:15",
      status: "Pending Payment",
      paymentMethod: "PayPal",
      subtotal: 80.0,
      tax: 9.0,
      shipping: 0.0,
      total: 89.0,
      items: [{ name: "Ergonomic Mouse", price: 80.0, qty: 1 }],
      courier: null,
      tracking: null,
      address: "456 Oak Ave, Seattle, WA",
      email: "m.chen@tech.io",
      timeline: [
        { status: "Order Placed", time: "Oct 24, 12:15", done: true },
        { status: "Awaiting Payment", time: "Oct 24, 12:15", done: false },
      ],
    },
    {
      id: "#ORD-7740",
      customer: "Emma Wilson",
      date: "2023-10-23 09:45",
      status: "Shipped",
      paymentMethod: "Apple Pay",
      subtotal: 190.0,
      tax: 12.2,
      shipping: 8.0,
      total: 210.2,
      items: [
        { name: "Mechanical Keyboard", price: 150.0, qty: 1 },
        { name: "Desk Mat", price: 40.0, qty: 1 },
      ],
      courier: "FedEx",
      tracking: "FX-9928310",
      address: "789 Pine Rd, Austin, TX",
      email: "emma.w@lifestyle.com",
      timeline: [
        { status: "Order Placed", time: "Oct 23, 09:45", done: true },
        { status: "Shipped", time: "Oct 23, 14:20", done: true },
        { status: "Out for Delivery", time: "Pending", done: false },
      ],
    },
  ]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab =
        selectedTab === "all" ||
        order.status.toLowerCase() === selectedTab.toLowerCase();
      return matchesSearch && matchesTab;
    });
  }, [orders, searchQuery, selectedTab]);

  const totalRevenue = useMemo(
    () => orders.reduce((acc, curr) => acc + curr.total, 0),
    [orders],
  );

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "processing":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "shipped":
        return "bg-violet-100 text-violet-700 border-violet-200";
      case "pending payment":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const handleAddOrder = () => {
    const sub = newOrder.items.reduce((a, b) => a + b.price * b.qty, 0);
    const newId = `#ORD-${Math.floor(Math.random() * 9000 + 1000)}`;
    const orderEntry = {
      id: newId,
      customer: newOrder.customer,
      date: new Date().toLocaleString(),
      status: "Processing",
      paymentMethod: "Manual Entry",
      subtotal: sub,
      tax: sub * 0.1,
      shipping: 5.0,
      total: sub + sub * 0.1 + 5.0,
      items: newOrder.items,
      courier: null,
      address: newOrder.address,
      email: newOrder.email,
      timeline: [{ status: "Order Created", time: "Just now", done: true }],
    };
    setOrders([orderEntry, ...orders]);
    setShowAddOrderModal(false);
  };

  // --- EDIT LOGIC ---
  const startEditing = () => {
    setEditFormData({ ...selectedOrder });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFormData(null);
  };

  const saveOrderChanges = () => {
    const updatedOrders = orders.map((o) =>
      o.id === editFormData.id ? { ...editFormData } : o,
    );
    setOrders(updatedOrders);
    setSelectedOrder(editFormData);
    setIsEditing(false);
  };

  const updateItemInEdit = (index, field, value) => {
    const updatedItems = [...editFormData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate totals
    const sub = updatedItems.reduce((a, b) => a + b.price * b.qty, 0);
    setEditFormData({
      ...editFormData,
      items: updatedItems,
      subtotal: sub,
      tax: sub * 0.1,
      total: sub + sub * 0.1 + editFormData.shipping,
    });
  };
  // ------------------

  const handleAssignCourier = (orderId, courierName) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            courier: courierName,
            tracking: `${courierName.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 1000000)}`,
            status: "Shipped",
            timeline: [
              ...o.timeline,
              {
                status: `Picked up by ${courierName}`,
                time: "Just now",
                done: true,
              },
            ],
          };
        }
        return o;
      }),
    );
    setShowCourierModal(false);
    setSelectedOrder(null);
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id],
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
      {/* Top Banner / Analytics */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Store Overview
            </h1>
            <p className="text-slate-500 font-medium">
              Real-time store performance and logistics.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm text-sm font-bold text-slate-700">
              <Download size={18} /> Export
            </button>
            <button
              onClick={() => setShowAddOrderModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 text-sm font-bold"
            >
              <Plus size={18} /> Create Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Revenue",
              val: `$${totalRevenue.toFixed(2)}`,
              icon: DollarSign,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              trend: "+12.5%",
            },
            {
              label: "New Orders",
              val: orders.length,
              icon: ShoppingCart,
              color: "text-indigo-600",
              bg: "bg-indigo-50",
              trend: "+4 today",
            },
            {
              label: "Active Shipments",
              val: orders.filter((o) => o.status === "Shipped").length,
              icon: Truck,
              color: "text-violet-600",
              bg: "bg-violet-50",
              trend: "In Transit",
            },
            {
              label: "Pending Payment",
              val: orders.filter((o) => o.status === "Pending Payment").length,
              icon: Clock,
              color: "text-amber-600",
              bg: "bg-amber-50",
              trend: "Needs action",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group"
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {stat.val}
                  </div>
                  <div
                    className={`text-[10px] mt-2 font-bold ${stat.color} flex items-center gap-1`}
                  >
                    <TrendingUp size={12} /> {stat.trend}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={22} />
                </div>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform duration-500">
                <stat.icon size={80} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {selectedOrderIds.length > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in zoom-in duration-200">
                <span className="text-sm font-bold text-indigo-700">
                  {selectedOrderIds.length} selected
                </span>
                <div className="w-[1px] h-4 bg-indigo-200 mx-1"></div>
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                {[
                  "All",
                  "Processing",
                  "Shipped",
                  "Completed",
                  "Pending Payment",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab.toLowerCase())}
                    className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all uppercase tracking-tight ${
                      selectedTab === tab.toLowerCase()
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by ID or customer..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.15em] font-black">
                <th className="px-6 py-5 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded-md border-slate-300 text-indigo-600"
                    checked={
                      selectedOrderIds.length === filteredOrders.length &&
                      filteredOrders.length > 0
                    }
                    onChange={(e) =>
                      setSelectedOrderIds(
                        e.target.checked ? filteredOrders.map((o) => o.id) : [],
                      )
                    }
                  />
                </th>
                <th className="px-4 py-5">Order Detail</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5">Total</th>
                <th className="px-6 py-5">Shipping Method</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-slate-50/80 transition cursor-pointer group ${selectedOrderIds.includes(order.id) ? "bg-indigo-50/20" : ""}`}
                >
                  <td className="px-6 py-5 text-center">
                    <input
                      type="checkbox"
                      className="rounded-md border-slate-300 text-indigo-600"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td
                    className="px-4 py-5"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="font-extrabold text-indigo-600 flex items-center gap-1.5">
                      {order.id}
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                        {order.paymentMethod.split(" ")[0]}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 mt-0.5">
                      {order.customer}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                      {order.date}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-900 text-lg">
                      ${order.total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {order.items.length} Product(s)
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {order.courier ? (
                      <div className="flex items-center gap-2 animate-in fade-in duration-300">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Truck size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            {order.courier}
                          </div>
                          <div className="text-[10px] text-indigo-500 font-mono tracking-tighter font-bold">
                            {order.tracking}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowCourierModal(true);
                        }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition"
                      >
                        <Layers size={14} /> Link Carrier
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Order Modal */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  Create Manual Order
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Add a new sale to your store records.
                </p>
              </div>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl shadow-sm border border-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">
                  Customer Info
                </h4>
                <input
                  type="text"
                  placeholder="Customer Full Name"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, customer: e.target.value })
                  }
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, email: e.target.value })
                  }
                />
                <textarea
                  placeholder="Shipping Address"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm min-h-[80px]"
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">
                  Products
                </h4>
                {newOrder.items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Item name"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      onChange={(e) => {
                        const items = [...newOrder.items];
                        items[i].name = e.target.value;
                        setNewOrder({ ...newOrder, items });
                      }}
                    />
                    <input
                      type="number"
                      placeholder="$"
                      className="w-20 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      onChange={(e) => {
                        const items = [...newOrder.items];
                        items[i].price = parseFloat(e.target.value);
                        setNewOrder({ ...newOrder, items });
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewOrder({
                      ...newOrder,
                      items: [
                        ...newOrder.items,
                        { name: "", price: 0, qty: 1 },
                      ],
                    })
                  }
                  className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold transition"
                >
                  + Add Item
                </button>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOrder}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
              >
                Create Order Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Modal */}
      {showCourierModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Dispatch Logistics
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Carrier for {selectedOrder.id}
                </p>
              </div>
              <button
                onClick={() => setShowCourierModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                {
                  name: "FedEx",
                  rate: 14.2,
                  eta: "2-3 Days",
                  color: "bg-purple-600",
                },
                {
                  name: "DHL Express",
                  rate: 22.5,
                  eta: "Next Day",
                  color: "bg-yellow-500",
                },
                {
                  name: "UPS",
                  rate: 12.8,
                  eta: "3-5 Days",
                  color: "bg-amber-900",
                },
                {
                  name: "Standard Post",
                  rate: 5.0,
                  eta: "5-7 Days",
                  color: "bg-blue-600",
                },
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleAssignCourier(selectedOrder.id, c.name)}
                  className="w-full flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center text-white font-black text-xl shadow-lg`}
                    >
                      {c.name[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-black text-slate-800">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {c.eta} • Local Delivery
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-indigo-600">
                      ${c.rate.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedOrder && !showCourierModal && !showAddOrderModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setSelectedOrder(null);
              setIsEditing(false);
            }}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                {isEditing && (
                  <button
                    onClick={cancelEditing}
                    className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <h2 className="text-2xl font-black text-slate-800">
                  {selectedOrder.id}
                </h2>
                {!isEditing && (
                  <span
                    className={`text-[10px] px-3 py-1 font-black uppercase tracking-widest rounded-lg border ${getStatusColor(selectedOrder.status)}`}
                  >
                    {selectedOrder.status}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setIsEditing(false);
                }}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-10 flex-1 overflow-y-auto no-scrollbar">
              {isEditing ? (
                // --- EDIT MODE VIEW ---
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                      Modify Customer
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-semibold"
                          value={editFormData.customer}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              customer: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-semibold"
                          value={editFormData.email}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                          Status
                        </label>
                        <select
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-semibold appearance-none"
                          value={editFormData.status}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              status: e.target.value,
                            })
                          }
                        >
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Completed">Completed</option>
                          <option value="Pending Payment">
                            Pending Payment
                          </option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                      Update Items
                    </h3>
                    <div className="space-y-4">
                      {editFormData.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-12 gap-3 items-end"
                        >
                          <div className="col-span-12 space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">
                              Product Name
                            </label>
                            <input
                              type="text"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold"
                              value={item.name}
                              onChange={(e) =>
                                updateItemInEdit(idx, "name", e.target.value)
                              }
                            />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">
                              Price ($)
                            </label>
                            <input
                              type="number"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold"
                              value={item.price}
                              onChange={(e) =>
                                updateItemInEdit(
                                  idx,
                                  "price",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">
                              Quantity
                            </label>
                            <input
                              type="number"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold"
                              value={item.qty}
                              onChange={(e) =>
                                updateItemInEdit(
                                  idx,
                                  "qty",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                // --- READ-ONLY VIEW (Drawer Contents) ---
                <>
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Calendar size={18} />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                        Order Journey
                      </h3>
                    </div>
                    <div className="space-y-8 ml-4">
                      {selectedOrder.timeline.map((event, idx) => (
                        <div key={idx} className="flex gap-6 relative">
                          {idx !== selectedOrder.timeline.length - 1 && (
                            <div
                              className={`absolute left-[9px] top-6 w-[2px] h-[calc(100%+16px)] ${event.done ? "bg-indigo-500" : "bg-slate-100"}`}
                            ></div>
                          )}
                          <div
                            className={`w-5 h-5 rounded-full border-4 z-10 mt-1 flex-shrink-0 transition-all duration-500 ${event.done ? "bg-white border-indigo-500 shadow-md" : "bg-white border-slate-200"}`}
                          >
                            {event.done && (
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mx-auto mt-0.5 animate-pulse" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`text-sm font-black ${event.done ? "text-slate-800" : "text-slate-300"}`}
                            >
                              {event.status}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                              {event.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                        <User size={24} />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-800">
                          {selectedOrder.customer}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {selectedOrder.email}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800">
                          {selectedOrder.paymentMethod}
                        </div>
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter">
                          Paid via Gateway
                        </div>
                      </div>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                      Inventory Items
                    </h3>
                    <div className="bg-slate-50 rounded-[32px] p-2">
                      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                        {selectedOrder.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-5 flex justify-between items-center border-b border-slate-50 last:border-0"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                <Package size={24} />
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-800">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-400 font-bold uppercase">
                                  QTY: {item.qty}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-900">
                                ${(item.qty * item.price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="p-6 bg-slate-50 space-y-3">
                          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                              Grand Total
                            </span>
                            <span className="text-2xl font-black text-indigo-600 tracking-tighter">
                              ${selectedOrder.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* Footer Actions (Dynamic based on state) */}
            <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 sticky bottom-0">
              {isEditing ? (
                <>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 py-4 rounded-2xl font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={saveOrderChanges}
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-100 text-xs uppercase tracking-widest"
                  >
                    <Save size={18} /> Save Update
                  </button>
                </>
              ) : (
                <>
                  <button className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 py-4 rounded-2xl font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
                    <FileText size={18} /> Invoice
                  </button>
                  <button
                    onClick={startEditing}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100 text-xs uppercase tracking-widest"
                  >
                    Update Order
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDashboard;
