import mongoose from "mongoose";

import AssetType from "@/models/AssetType.model";

export const ASSET_METHODS = ["cash", "bkash", "nagad", "bank", "cheque", "card", "other"];

/** Checks the asset form; shared by create and update */
export async function readAsset(body) {
  if (!mongoose.isValidObjectId(body.typeId)) return { error: "Select a category" };

  const type = await AssetType.findOne({ _id: body.typeId, deletedAt: null }).lean();

  if (!type) return { error: "That category no longer exists" };

  const amount = Math.round(Number(body.amount) * 100) / 100;

  if (!(amount > 0)) return { error: "Enter an amount greater than 0" };

  const assetDate = body.assetDate ? new Date(body.assetDate) : new Date();

  if (Number.isNaN(assetDate.getTime())) return { error: "Enter a valid date" };

  return {
    data: {
      typeId: type._id,
      typeName: type.name,
      amount,
      assetDate,
      paymentMethod: ASSET_METHODS.includes(body.paymentMethod) ? body.paymentMethod : "cash",
      reference: String(body.reference || "").trim(),
      note: String(body.note || "").trim(),
    },
  };
}
