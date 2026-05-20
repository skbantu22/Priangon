import { NextResponse } from "next/server";

import Product from "@/models/Product.model";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import Showroom from "@/models/Showroom.model";
import { connectDB } from "@/lib/databaseconnection";

export async function GET() {
  try {
    await connectDB();

    // --------------------------
    // 1. GET PRODUCTS
    // --------------------------
    const products = await Product.find().lean();

    // --------------------------
    // 2. WAREHOUSE STOCK MAP
    // --------------------------
    const warehouseStocks = await WarehouseStock.find().lean();

    const warehouseMap = {};
    warehouseStocks.forEach((item) => {
      warehouseMap[item.productId?.toString()] = item.stock;
    });

    // --------------------------
    // 3. SHOWROOM STOCKS
    // --------------------------
    const showroomStocks = await ShowroomStock.find()
      .populate("showroomId")
      .lean();

    const showroomMap = {};

    showroomStocks.forEach((item) => {
      const sId = item.showroomId?._id?.toString();

      if (!showroomMap[sId]) {
        showroomMap[sId] = {
          showroomId: sId,
          showroomName: item.showroomId?.name,
          stocks: [],
        };
      }

      showroomMap[sId].stocks.push({
        productId: item.productId?.toString(),
        stock: item.stock,
      });
    });

    // --------------------------
    // 4. FINAL FORMAT
    // --------------------------
    const result = {
      warehouse: products.map((p) => ({
        productId: p._id,
        name: p.name,
        stock: warehouseMap[p._id.toString()] || 0,
      })),

      showrooms: Object.values(showroomMap).map((s) => ({
        showroomId: s.showroomId,
        showroomName: s.showroomName,
        stocks: s.stocks.map((st) => {
          const product = products.find(
            (p) => p._id.toString() === st.productId,
          );

          return {
            productId: st.productId,
            productName: product?.name || "Unknown",
            stock: st.stock,
          };
        }),
      })),
    };

    // --------------------------
    // 5. RESPONSE
    // --------------------------
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load current stock",
      },
      { status: 500 },
    );
  }
}
