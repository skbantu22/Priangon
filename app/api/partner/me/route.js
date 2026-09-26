import { NextResponse } from "next/server";
import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import POSOrder from "@/models/posorder.model";
import PartnerOrder from "@/models/PartnerOrder.model";
import CustomerPayment from "@/models/CustomerPayment.model";

const BD_OFFSET = 6 * 3600 * 1000;
const monthKey = (d) => new Date(new Date(d).getTime() + BD_OFFSET).toISOString().slice(0, 7);

// GET /api/partner/me: the partner's account, balance, trends and latest activity
export async function GET() {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  const { user, customer, type } = partner;
  const mine = { customerId: customer._id, status: "completed" };

  // the last 12 months, oldest first, in Bangladesh time
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    return d.toISOString().slice(0, 7);
  });
  const since = new Date(`${months[0]}-01T00:00:00+06:00`);
  const thisMonth = monthKey(now);

  const [totals, recentInvoices, orderCounts, recentOrders, byMonth, topProducts, lastPayment] = await Promise.all([
    POSOrder.aggregate([
      { $match: mine },
      {
        $group: {
          _id: null,
          invoices: { $sum: 1 },
          spent: { $sum: "$total" },
          due: { $sum: { $ifNull: ["$dueAmount", 0] } },
          units: { $sum: { $sum: "$items.qty" } },
        },
      },
    ]),
    POSOrder.find(mine)
      .select("orderNumber saleDate createdAt total paidAmount dueAmount items.qty")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    PartnerOrder.aggregate([
      { $match: { customerId: customer._id } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
    PartnerOrder.find({ customerId: customer._id })
      .select("orderNumber createdAt total status items.qty invoiceNumber")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    POSOrder.aggregate([
      { $match: { ...mine, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$saleDate", "$createdAt"] }, timezone: "+06:00" } },
          amount: { $sum: "$total" },
          invoices: { $sum: 1 },
        },
      },
    ]),
    POSOrder.aggregate([
      { $match: mine },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.variantId",
          name: { $first: "$items.productName" },
          variant: { $first: { $trim: { input: { $concat: [{ $ifNull: ["$items.color", ""] }, " ", { $ifNull: ["$items.size", ""] }] } } } },
          qty: { $sum: "$items.qty" },
          amount: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.qty", "$items.price"] }] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 6 },
    ]),
    CustomerPayment.findOne({ customerId: customer._id, type: "receive", deletedAt: null })
      .sort({ date: -1 })
      .select("amount date method invoiceNo")
      .lean(),
  ]);

  const t = totals[0] || {};
  const counts = Object.fromEntries(orderCounts.map((c) => [c._id, c.n]));
  const monthMap = new Map(byMonth.map((m) => [m._id, m]));
  const monthly = months.map((key) => ({
    key,
    label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
    amount: monthMap.get(key)?.amount || 0,
    invoices: monthMap.get(key)?.invoices || 0,
  }));

  return NextResponse.json({
    success: true,
    user: { name: user.name, email: user.email },
    customer: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    },
    type,
    typeLabel: CUSTOMER_TYPES[type].short,
    canOrder: user.canOrder !== false,
    stats: {
      invoices: t.invoices || 0,
      spent: t.spent || 0,
      due: t.due || 0,
      units: t.units || 0,
      monthSpent: monthMap.get(thisMonth)?.amount || 0,
      monthInvoices: monthMap.get(thisMonth)?.invoices || 0,
      openOrders: (counts.pending || 0) + (counts.confirmed || 0),
      pendingOrders: counts.pending || 0,
      confirmedOrders: counts.confirmed || 0,
    },
    lastPayment: lastPayment ? { amount: lastPayment.amount, date: lastPayment.date, method: lastPayment.method } : null,
    monthly,
    topProducts: topProducts.map((p) => ({ name: p.name || "Item", variant: p.variant || "", qty: p.qty, amount: p.amount })),
    recentInvoices,
    recentOrders,
  });
}
