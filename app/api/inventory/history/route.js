import { connectDB } from "@/lib/databaseconnection";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(req) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  await connectDB();

  const history = await InventoryTransaction.find()
    .populate("productId")
    .populate("variantId")
    .sort({ createdAt: -1 })
    .limit(100);

  return Response.json({
    success: true,
    data: history,
  });
}
