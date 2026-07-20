import { connectDB } from "@/lib/databaseconnection";

import Product from "@/models/Product.model";
import ShowroomStock from "@/models/ShowroomStock";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";
import "@/models/category.model";

import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!showroomId) {
      return NextResponse.json(
        {
          success: false,
          message: "showroomId is required",
        },
        { status: 400 },
      );
    }

    // ==========================================
    // SHOWROOM STOCK
    // ==========================================

    const showroomStocks = await ShowroomStock.find({
      showroomId,
    }).lean();

    const stockMap = new Map();
    const productIds = new Set();

    showroomStocks.forEach((stock) => {
      const variantId = String(stock.variantId);
      const productId = String(stock.productId);

      stockMap.set(variantId, Number(stock.stock || 0));

      productIds.add(productId);
    });

    // ==========================================
    // PRODUCTS
    // ==========================================

    const products = await Product.find({
      _id: {
        $in: [...productIds],
      },
      deletedAt: null,
    })
      .populate("category")
      .populate("media")
      .populate({
        path: "variants",
        populate: {
          path: "media",
        },
      })
      .lean();

    // ==========================================
    // FORMAT
    // ==========================================

    const items = products
      .map((product) => {
        const variants = (product.variants || []).map((variant) => ({
          ...variant,

          stock: stockMap.get(String(variant._id)) || 0,
        }));

        return {
          ...product,
          variants,
          totalStock: variants.reduce((sum, v) => sum + (v.stock || 0), 0),
        };
      })
      .filter((product) => {
        if (!q) return true;

        const productName = (product.name || "").toLowerCase();

        const variantMatch = product.variants.some((v) => {
          return (
            (v.barcode || "").toLowerCase().includes(q) ||
            (v.sku || "").toLowerCase().includes(q)
          );
        });

        return productName.includes(q) || variantMatch;
      });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
