import { connectDB } from "@/lib/databaseconnection";
import { response } from "@/lib/helperfunction";

import ProductVariantModel from "@/models/ProductVariant.model";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock.model"; // থাকলে

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id) {
      return response(false, 400, "Variant id missing");
    }

    const variant = await ProductVariantModel.findById(id);

    if (!variant) {
      return response(false, 404, "Variant not found");
    }

    // Delete warehouse stock
    await WarehouseStock.deleteMany({
      variantId: id,
    });

    // Delete showroom stock (if exists)
    await ShowroomStock.deleteMany({
      variantId: id,
    });

    // Delete variant
    await ProductVariantModel.findByIdAndDelete(id);

    return response(true, 200, "Variant deleted successfully");
  } catch (error) {
    console.log(error);
    return response(false, 500, error.message);
  }
}
