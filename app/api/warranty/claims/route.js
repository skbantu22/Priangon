import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import POSOrder from "@/models/posorder.model";
import WarrantyClaim, { CLAIM_STATUSES } from "@/models/WarrantyClaim.model";
import { warrantyStatus } from "@/lib/warranty";
import { longNumber } from "@/lib/documentNumber";

const STAFF = ["admin", "manager", "cashier"];

const staffOnly = async () => {
  const auth = await isAuthenticated();
  return auth.isAuth && STAFF.includes(auth.role) ? auth : null;
};

const unauthorized = () =>
  NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 403 },
  );

// GET /api/warranty/claims?status=received
export async function GET(req) {
  if (!(await staffOnly())) return unauthorized();

  try {
    await connectDB();

    const status = new URL(req.url).searchParams.get("status");
    const filter = CLAIM_STATUSES.includes(status) ? { status } : {};

    const [claims, counts] = await Promise.all([
      WarrantyClaim.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
      WarrantyClaim.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);

    return NextResponse.json({
      success: true,
      claims,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// POST { orderId, variantId, imei, issue, notes, receivedBy }
export async function POST(req) {
  if (!(await staffOnly())) return unauthorized();

  try {
    await connectDB();

    const { orderId, variantId, imei = "", issue, notes, receivedBy } =
      await req.json();

    if (!issue?.trim()) throw new Error("Describe the problem");

    const order = await POSOrder.findById(orderId).lean();
    if (!order) throw new Error("Order not found");

    const item = order.items.find(
      (i) =>
        String(i.variantId) === String(variantId) &&
        (!imei || (i.imeis || []).includes(imei)),
    );
    if (!item) throw new Error("This unit is not on that invoice");

    const open = await WarrantyClaim.findOne({
      orderId,
      variantId,
      imei,
      status: { $in: ["received", "sent_to_service"] },
    }).lean();
    if (open) {
      throw new Error(`A claim is already open for this unit (${open.claimNumber})`);
    }

    const claim = await WarrantyClaim.create({
      claimNumber: longNumber(),
      orderId,
      orderNumber: order.orderNumber,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: [item.size, item.color].filter(Boolean).join(" · "),
      imei,
      customerName: order.customerName,
      phone: order.phone || "",
      warrantyExpiry: item.warrantyExpiry,
      underWarranty: warrantyStatus(item.warrantyExpiry).active,
      issue: issue.trim(),
      notes: notes?.trim() || "",
      showroomId: order.showroomId,
      receivedBy: receivedBy || "",
    });

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
