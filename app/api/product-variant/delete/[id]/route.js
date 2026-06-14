import { connectDB } from "@/lib/databaseconnection";
import { response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return response(false, 400, "Variant id missing");
    }

    const variant = await ProductVariantModel.findById(id);

    if (!variant) {
      return response(false, 404, "Variant not found");
    }

    await ProductVariantModel.findByIdAndDelete(id);

    return response(true, 200, "Variant deleted successfully");
  } catch (error) {
    console.log("DELETE VARIANT ERROR:", error);
    return response(false, 500, error.message);
  }
}
