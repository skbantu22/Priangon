// import { NextResponse } from "next/server";
// import { connectDB } from "@/lib/databaseconnection";

// import WarehouseStock from "@/models/WarehouseStock.model";
// import ShowroomStock from "@/models/ShowroomStock";

// import "@/models/Product.model";
// import "@/models/ProductVariant.model ";
// import Showroom from "@/models/Showroom.model";
// import "@/models/Media.model";
// import "@/models/category.model";

// export async function GET(req) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(req.url);
//     const search = (searchParams.get("search") || "").toLowerCase();

//     // ==========================
//     // Warehouse Stocks
//     // ==========================
//     let warehouseStocks = await WarehouseStock.find()
//       .populate({
//         path: "productId",
//         populate: [
//           {
//             path: "category",
//             select: "name",
//           },
//           {
//             path: "media",
//             select: "secure_url",
//           },
//         ],
//       })
//       .populate({
//         path: "variantId",
//         populate: {
//           path: "media",
//           select: "secure_url url",
//         },
//       })
//       .lean();

//     // Remove invalid records
//     warehouseStocks = warehouseStocks.filter(
//       (item) => item.productId && item.variantId,
//     );

//     // ==========================
//     // Search
//     // ==========================
//     if (search) {
//       warehouseStocks = warehouseStocks.filter((item) => {
//         return (
//           item.productId?.name?.toLowerCase().includes(search) ||
//           item.variantId?.barcode?.toLowerCase().includes(search) ||
//           item.variantId?.sku?.toLowerCase().includes(search)
//         );
//       });
//     }

//     // ==========================
//     // Load All Showrooms
//     // ==========================
//     const showrooms = await Showroom.find({}, "name").lean();

//     // ==========================
//     // Load All Showroom Stocks
//     // ==========================
//     const showroomStocks = await ShowroomStock.find()
//       .populate("showroomId", "name")
//       .lean();

//     const showroomMap = {};

//     showroomStocks.forEach((stock) => {
//       const key = `${stock.productId}_${stock.variantId}`;

//       if (!showroomMap[key]) {
//         showroomMap[key] = [];
//       }

//       showroomMap[key].push({
//         showroomId: stock.showroomId?._id,
//         showroomName: stock.showroomId?.name,
//         stock: Number(stock.stock) || 0,
//       });
//     });

//     // ==========================
//     // Group Products
//     // ==========================
//     const groupedProducts = {};

//     warehouseStocks.forEach((item) => {
//       const variantKey = `${item.productId._id}_${item.variantId._id}`;

//       // Every showroom will appear
//       const showroomList = showrooms.map((showroom) => {
//         const found = (showroomMap[variantKey] || []).find(
//           (s) => String(s.showroomId) === String(showroom._id),
//         );

//         return {
//           showroomId: showroom._id,
//           showroomName: showroom.name,
//           stock: found ? found.stock : 0,
//         };
//       });

//       const warehouseStock = Number(item.stock) || 0;

//       const showroomTotal = showroomList.reduce((sum, s) => sum + s.stock, 0);

//       const variantTotal = warehouseStock + showroomTotal;

//       const productId = item.productId._id.toString();

//       if (!groupedProducts[productId]) {
//         groupedProducts[productId] = {
//           _id: item.productId._id,
//           name: item.productId.name,
//           slug: item.productId.slug,
//           category: item.productId.category?.name || "",
//           image: item.productId.media?.[0]?.secure_url || null,
//           totalStock: 0,
//           variants: [],
//         };
//       }

//       groupedProducts[productId].totalStock += variantTotal;

//       groupedProducts[productId].variants.push({
//         _id: item.variantId._id,

//         color: item.variantId.color,
//         size: item.variantId.size,

//         barcode: item.variantId.barcode,
//         sku: item.variantId.sku,

//         image:
//           item.variantId.media?.[0]?.secure_url ||
//           item.productId.media?.[0]?.secure_url ||
//           null,

//         warehouseStock,

//         reservedStock: Number(item.reservedStock) || 0,

//         totalStock: variantTotal,

//         showroomStocks: showroomList,
//       });
//     });

//     const data = Object.values(groupedProducts);

//     return NextResponse.json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (err) {
//     console.error("Stock Checker Error:", err);

//     return NextResponse.json(
//       {
//         success: false,
//         message: err.message,
//       },
//       {
//         status: 500,
//       },
//     );
//   }
// }
