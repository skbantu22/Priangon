import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import PartnerOrder from "@/models/PartnerOrder.model";

// PATCH { action: "cancel" }: a partner may cancel their own order while it
// has not been accepted by the shop yet
export async function PATCH(req, { params }) {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  if (action !== "cancel" || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const order = await PartnerOrder.findOneAndUpdate(
    { _id: id, customerId: partner.customer._id, status: "pending" },
    { status: "cancelled" },
    { new: true },
  ).lean();

  if (!order) {
    return NextResponse.json(
      { success: false, message: "Only a pending order can be cancelled" },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true, order });
}
