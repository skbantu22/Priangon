import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import PartnerOrder from "@/models/PartnerOrder.model";
import POSOrder from "@/models/posorder.model";
import Product from "@/models/Product.model";

const STAFF = ["admin", "manager", "cashier"];

const staff = async () => {
  const auth = await isAuthenticated();
  return auth.isAuth && STAFF.includes(auth.role);
};
const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

// GET: one order (used by the POS to load it into the cart)
export async function GET(req, { params }) {
  if (!(await staff())) return fail("Unauthorized", 403);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  await connectDB();
  const order = await PartnerOrder.findById(id).lean();
  if (!order) return fail("Order not found", 404);

  // the POS needs each product's warranty / IMEI rule to build the cart
  const products = await Product.find({ _id: { $in: order.items.map((i) => i.productId) } })
    .select("warranty trackSerial")
    .lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  order.items = order.items.map((i) => {
    const p = productMap.get(String(i.productId));
    return {
      ...i,
      trackSerial: !!p?.trackSerial,
      warrantyType: p?.warranty?.type || "none",
      warrantyMonths: p?.warranty?.months || 0,
    };
  });

  return NextResponse.json({ success: true, order });
}

// PATCH { status: "confirmed" | "cancelled" | "invoiced", posOrderId?, staffNote? }
export async function PATCH(req, { params }) {
  if (!(await staff())) return fail("Unauthorized", 403);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  await connectDB();
  const { status, posOrderId, staffNote } = await req.json().catch(() => ({}));
  const order = await PartnerOrder.findById(id);
  if (!order) return fail("Order not found", 404);
  if (["invoiced", "cancelled"].includes(order.status)) {
    return fail(`This order is already ${order.status}`);
  }

  if (status === "invoiced") {
    // the invoice must be a real sale to the same customer
    const sale = mongoose.isValidObjectId(posOrderId)
      ? await POSOrder.findOne({ _id: posOrderId, customerId: order.customerId })
          .select("orderNumber")
          .lean()
      : null;
    if (!sale) return fail("Invoice not found for this customer");
    order.posOrderId = sale._id;
    order.invoiceNumber = sale.orderNumber;
  } else if (!["confirmed", "cancelled"].includes(status)) {
    return fail("Invalid status");
  }

  order.status = status;
  if (typeof staffNote === "string") order.staffNote = staffNote.trim().slice(0, 500);
  await order.save();

  return NextResponse.json({ success: true, order });
}
