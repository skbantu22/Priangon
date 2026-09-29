import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";

import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import WishlistModel from "@/models/wishlist.model";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";

/* ================= PUT → Soft Delete / Restore ================= */

export async function PUT(request) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await request.json();

    console.log("BODY =>", body);

    const { ids = [], deleteType } = body;

    console.log("IDS =>", ids);
    console.log("DELETE TYPE =>", deleteType);

    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid or empty id list");
    }

    if (!["SD", "RSD"].includes(deleteType)) {
      return response(false, 400, "Delete type must be SD or RSD");
    }

    const update =
      deleteType === "SD" ? { deletedAt: new Date() } : { deletedAt: null };

    const result = await ProductModel.updateMany(
      { _id: { $in: ids } },
      { $set: update },
    );

    return response(true, 200, "Products updated successfully", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log(error);
    return catchError(error);
  }
}

/* ================= DELETE → Permanent Delete ================= */

export async function DELETE(request) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { ids = [], deleteType } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid or empty id list");
    }

    if (deleteType !== "PD") {
      return response(false, 400, "Delete type must be PD");
    }

    const trashed = await ProductModel.find({
      _id: { $in: ids },
      deletedAt: { $ne: null },
    })
      .select("_id")
      .lean();
    const trashedIds = trashed.map((product) => product._id);

    if (!trashedIds.length) {
      return response(false, 404, "Only products in trash can be deleted permanently");
    }

    await ProductVariant.deleteMany({ product: { $in: trashedIds } });
    await WarehouseStock.deleteMany({ productId: { $in: trashedIds } });
    await ShowroomStock.deleteMany({ productId: { $in: trashedIds } });
    await WishlistModel.deleteMany({ productId: { $in: trashedIds } });

    const result = await ProductModel.deleteMany({ _id: { $in: trashedIds } });

    return response(true, 200, "Products deleted permanently", {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return catchError(error);
  }
}
