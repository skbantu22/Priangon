import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import POSOrder from "@/models/posorder.model";
import WarrantyClaim from "@/models/WarrantyClaim.model";
import { warrantyStatus } from "@/lib/warranty";

const STAFF = ["admin", "manager", "cashier"];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/warranty/lookup?q=<IMEI | serial | INV-000123 | phone>
// One row per sold unit, with its warranty status and past claims.
export async function GET(req) {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !STAFF.includes(auth.role)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    await connectDB();

    const q = (new URL(req.url).searchParams.get("q") || "").trim();
    if (q.length < 3) {
      return NextResponse.json({ success: true, units: [] });
    }

    const filter = /^INV-/i.test(q)
      ? { orderNumber: q.toUpperCase() }
      : /^01\d{9}$/.test(q)
        ? { phone: q }
        : { "items.imeis": { $regex: `^${escapeRegex(q)}`, $options: "i" } };

    const orders = await POSOrder.find({ ...filter, status: "completed" })
      .select("orderNumber saleDate createdAt customerName phone items")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const claims = await WarrantyClaim.find({
      orderId: { $in: orders.map((o) => o._id) },
    })
      .sort({ createdAt: -1 })
      .lean();

    const units = [];
    for (const order of orders) {
      for (const item of order.items) {
        // a phone sold x2 is two units, each with its own IMEI
        const serials = item.imeis?.length ? item.imeis : [""];
        for (const imei of serials) {
          // searching by IMEI: show only the matching unit
          if (filter["items.imeis"] && !imei.toLowerCase().startsWith(q.toLowerCase()))
            continue;

          const status = warrantyStatus(item.warrantyExpiry);
          units.push({
            key: `${order._id}-${item.variantId}-${imei}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            saleDate: order.saleDate || order.createdAt,
            customerName: order.customerName,
            phone: order.phone || "",
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantLabel: [item.size, item.color].filter(Boolean).join(" · "),
            image: item.image || "",
            qty: item.imeis?.length ? 1 : item.qty,
            imei,
            warrantyType: item.warrantyType || "none",
            warrantyMonths: item.warrantyMonths || 0,
            warrantyExpiry: item.warrantyExpiry,
            ...status,
            claims: claims.filter(
              (c) =>
                String(c.orderId) === String(order._id) &&
                String(c.variantId) === String(item.variantId) &&
                (c.imei || "") === imei,
            ),
          });
        }
      }
    }

    return NextResponse.json({ success: true, units });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
