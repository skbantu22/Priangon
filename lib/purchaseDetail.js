import mongoose from "mongoose";

import PurchaseModel from "@/models/Purchase.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import { connectDB } from "@/lib/databaseconnection";
import { purchaseBelongsToAuth, purchaseLocationForAuth } from "@/lib/purchaseService";

/** Load one purchase for the invoice screen and the GET /api/purchase/[id] route. */
export async function loadPurchaseDetail(id, auth) {
  await connectDB();

  const purchaseId = String(id || "").trim();
  if (!mongoose.isValidObjectId(purchaseId)) {
    return { ok: false, status: 404, message: "Purchase not found" };
  }

  const purchase = await PurchaseModel.findOne({ _id: purchaseId, deletedAt: null })
    .populate("supplierId", "name companyName phone email address")
    .lean();

  if (!purchase) {
    return { ok: false, status: 404, message: "Purchase not found" };
  }

  const location = await purchaseLocationForAuth(auth);
  if (!purchaseBelongsToAuth(purchase, location, auth)) {
    return { ok: false, status: 404, message: "Purchase not found" };
  }

  const returns = await PurchaseReturn.find({ "items.purchaseId": purchase._id, deletedAt: null })
    .select("returnNumber returnDate items total")
    .sort({ returnDate: 1 })
    .lean();

  return {
    ok: true,
    data: JSON.parse(
      JSON.stringify({
        ...purchase,
        returns: returns.map((ret) => ({
          _id: ret._id,
          returnNumber: ret.returnNumber,
          returnDate: ret.returnDate,
          total: ret.items
            .filter((item) => String(item.purchaseId) === String(purchase._id))
            .reduce((sum, item) => sum + (Number(item.total) || 0), 0),
        })),
      }),
    ),
  };
}
