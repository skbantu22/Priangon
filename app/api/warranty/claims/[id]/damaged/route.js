import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import WarrantyClaim from "@/models/WarrantyClaim.model";
import { copyClaimToDamaged } from "@/lib/damagedStockService";

const STAFF = ["admin", "manager", "cashier"];

// POST: also put this claim's unit on the damaged shelf (the claim is left as it is)
export async function POST(_req, { params }) {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !STAFF.includes(auth.role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    await connectDB();

    const { id } = await params;
    const claim = await WarrantyClaim.findById(id);
    if (!claim) throw new Error("Claim not found");

    const lot = await copyClaimToDamaged(claim);
    claim.damagedLotId = lot._id;
    await claim.save();

    return NextResponse.json({ success: true, message: `${claim.claimNumber} is on the damaged shelf too`, lotId: lot._id });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
