import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import WarrantyClaim, { CLAIM_STATUSES } from "@/models/WarrantyClaim.model";

const STAFF = ["admin", "manager", "cashier"];

// PATCH { status?, notes? }
export async function PATCH(req, { params }) {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !STAFF.includes(auth.role)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    await connectDB();

    const { id } = await params;
    const { status, notes } = await req.json();

    const update = {};
    if (status) {
      if (!CLAIM_STATUSES.includes(status)) throw new Error("Invalid status");
      update.status = status;
      update.deliveredAt = status === "delivered" ? new Date() : null;
    }
    if (typeof notes === "string") update.notes = notes.trim();

    const claim = await WarrantyClaim.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();
    if (!claim) throw new Error("Claim not found");

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
