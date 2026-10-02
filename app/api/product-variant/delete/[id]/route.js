import { connectDB } from "@/lib/databaseconnection";
import { response } from "@/lib/helperfunction";

import ProductVariantModel from "@/models/ProductVariant.model ";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function DELETE(request, { params }) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!id) {
      return response(false, 400, "Variant id missing");
    }

    const variant = await ProductVariantModel.findById(id);

    if (!variant) {
      return response(false, 404, "Variant not found");
    }

    if (variant.deletedAt) {
      return response(false, 404, "Variant not found");
    }

    // Moved to the trash, not wiped: the stock rows stay put, so restoring
    // the variant brings its quantities back with it. The trash clears both
    // for good after 30 days.
    variant.deletedAt = new Date();
    await variant.save();

    return response(true, 200, "Variant moved to trash");
  } catch (error) {
    console.log(error);
    return response(false, 500, error.message);
  }
}
