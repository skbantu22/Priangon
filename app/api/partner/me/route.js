import { NextResponse } from "next/server";
import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import POSOrder from "@/models/posorder.model";
import PartnerOrder from "@/models/PartnerOrder.model";

// GET /api/partner/me: the partner's account, balance and latest activity
export async function GET() {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  const { user, customer, type } = partner;
  const mine = { customerId: customer._id, status: "completed" };

  const [totals, recentInvoices, orderCounts, recentOrders] = await Promise.all([
    POSOrder.aggregate([
      { $match: mine },
      {
        $group: {
          _id: null,
          invoices: { $sum: 1 },
          spent: { $sum: "$total" },
          due: { $sum: { $ifNull: ["$dueAmount", 0] } },
        },
      },
    ]),
    POSOrder.find(mine)
      .select("orderNumber saleDate createdAt total paidAmount dueAmount items.qty")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    PartnerOrder.aggregate([
      { $match: { customerId: customer._id } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
    PartnerOrder.find({ customerId: customer._id })
      .select("orderNumber createdAt total status items.qty invoiceNumber")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const t = totals[0] || {};
  const counts = Object.fromEntries(orderCounts.map((c) => [c._id, c.n]));

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
    stats: {
      invoices: t.invoices || 0,
      spent: t.spent || 0,
      due: t.due || 0,
      openOrders: (counts.pending || 0) + (counts.confirmed || 0),
    },
    recentInvoices,
    recentOrders,
  });
}
