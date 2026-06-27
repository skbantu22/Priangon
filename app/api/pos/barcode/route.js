import { connectDB } from "@/lib/databaseconnection";

import ShowroomStock from "@/models/ShowroomStock";

import "@/models/Product.model";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const barcode = searchParams.get("barcode");
    const showroomId = searchParams.get("showroomId");

    if (!barcode) {
      return Response.json(
        {
          success: false,
          message: "Barcode is required",
        },
        { status: 400 },
      );
    }

    const filter = {
      stock: { $gt: 0 },
    };

    if (showroomId) {
      filter.showroomId = showroomId;
    }

    const stock = await ShowroomStock.findOne(filter)
      .populate({
        path: "productId",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .populate({
        path: "variantId",
        match: {
          barcode,
        },
        select: "color size barcode sku mrp sellingPrice",
      })
      .lean();

    if (!stock || !stock.variantId || !stock.productId) {
      return Response.json({
        success: false,
        message: "Product not found",
      });
    }

    return Response.json({
      success: true,

      product: {
        _id: stock.productId._id,
        name: stock.productId.name,
        media: stock.productId.media || [],
      },

      variant: {
        _id: stock.variantId._id,
        color: stock.variantId.color,
        size: stock.variantId.size,
        barcode: stock.variantId.barcode,
        sku: stock.variantId.sku,
        mrp: stock.variantId.mrp,
        sellingPrice: stock.variantId.sellingPrice,
        stock: stock.stock,
      },
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        success: false,
        message: "Server Error",
      },
      {
        status: 500,
      },
    );
  }
}
