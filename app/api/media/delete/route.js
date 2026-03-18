import { connectDB } from "@/lib/databaseconnection";
import MediaModel from "@/models/Media.model";
import { catchError, response } from "@/lib/helperfunction";

/* ===== PUT → Soft Delete / Restore ===== */
export async function PUT(request) {
  try {
    console.log("✅ MEDIA PUT HIT");

    await connectDB();

    const payload = await request.json();
    const ids = payload.ids || []; // ✅ fixed
    const deleteType = payload.deleteType;

    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid or empty id list.");
    }

    if (!["SD", "RSD"].includes(deleteType)) {
      return response(false, 400, "Delete type must be SD or RSD.");
    }

    // ✅ Soft Delete / Restore
    const result = await MediaModel.updateMany(
      { _id: { $in: ids } },
      deleteType === "SD"
        ? { $set: { deletedAt: new Date() } }
        : { $set: { deletedAt: null } }
    );

    return response(
      true,
      200,
      deleteType === "SD"
        ? "Media moved into trash."
        : "Media restored successfully.",
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      }
    );
  } catch (error) {
    return catchError(error);
  }
}

/* ===== DELETE → Permanent Delete ===== */
export async function DELETE(request) {
  try {
    console.log("✅ MEDIA DELETE HIT");

    await connectDB();

    const payload = await request.json();
    const ids = payload.ids || [];
    const deleteType = payload.deleteType;

    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid or empty id list.");
    }

    if (deleteType !== "PD") {
      return response(false, 400, "Delete type must be PD.");
    }

    const result = await MediaModel.deleteMany({ _id: { $in: ids } });

    return response(true, 200, "Media deleted permanently.", {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return catchError(error);
  }
}
