import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";

/* ================= PUT → Soft Delete / Restore ================= */
export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();
    const { ids = [], deleteType } = payload;

    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid or empty id list");
    }

    if (!["SD", "RSD"].includes(deleteType)) {
      return response(false, 400, "Delete type must be SD or RSD");
    }

    const update =
      deleteType === "SD"
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const result = await ProductModel.updateMany(
      { _id: { $in: ids } },
      { $set: update }
    );

    return response(true, 200, "Category updated successfully", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return catchError(error);
  }
}

/* ================= DELETE → Permanent Delete ================= */
export async function DELETE(request) {
  try {
    await connectDB();

    const payload = await request.json();
    const { ids = [], deleteType } = payload;

    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid or empty id list");
    }

    if (deleteType !== "PD") {
      return response(false, 400, "Delete type must be PD");
    }

    const result = await ProductModel.deleteMany({
      _id: { $in: ids },
    });

    return response(true, 200, "Category deleted permanently", {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return catchError(error);
  }
}
