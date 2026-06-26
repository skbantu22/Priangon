// // app/api/import-products/route.js

// import fs from "fs";
// import path from "path";
// import csv from "csv-parser";
// import slugify from "slugify";

// import { connectDB } from "@/lib/databaseconnection";

// import Product from "@/models/Product.model";
// import ProductVariant from "@/models/ProductVariant.model ";
// import Category from "@/models/category.model";

// const DEFAULT_MEDIA_ID = "697a2c2a4fd8a1baba22ad95";

// export async function POST() {
//   try {
//     await connectDB();

//     const filePath = path.join(
//       process.cwd(),
//       "components",
//       "ui",
//       "Application",
//       "Admin",
//       "products",
//       "data",
//       "ProductsExport.csv",
//     );

//     console.log("CSV Path:", filePath);
//     console.log("File Exists:", fs.existsSync(filePath));

//     if (!fs.existsSync(filePath)) {
//       return Response.json(
//         {
//           success: false,
//           message: "ProductsExport.csv not found",
//         },
//         { status: 404 },
//       );
//     }
//     const rows = [];

//     await new Promise((resolve, reject) => {
//       fs.createReadStream(filePath)
//         .pipe(csv())
//         .on("data", (row) => rows.push(row))
//         .on("end", resolve)
//         .on("error", reject);
//     });

//     let productsCreated = 0;
//     let variantsCreated = 0;
//     let skipped = 0;

//     for (const row of rows) {
//       try {
//         const productName = row.name?.trim();

//         if (!productName) {
//           skipped++;
//           continue;
//         }

//         // Find Category
//         const category = await Category.findOne({
//           name: {
//             $regex: `^${row.category?.trim()}$`,
//             $options: "i",
//           },
//           deletedAt: null,
//         });

//         if (!category) {
//           console.log(`❌ Category Not Found: ${row.category}`);
//           skipped++;
//           continue;
//         }

//         // Find Product
//         let product = await Product.findOne({
//           name: productName,
//           deletedAt: null,
//         });

//         // Create Product
//         if (!product) {
//           product = await Product.create({
//             name: productName,

//             slug: slugify(productName, {
//               lower: true,
//               strict: true,
//             }),

//             category: category._id,

//             description: productName,

//             mrp: Number(row.selling_price || 0),

//             sellingPrice: Number(row.selling_price || 0),

//             media: [DEFAULT_MEDIA_ID],

//             freeDelivery: false,
//           });

//           productsCreated++;
//         }

//         // Skip duplicate barcode
//         if (row.barcode) {
//           const exists = await ProductVariant.findOne({
//             barcode: row.barcode.trim(),
//           });

//           if (exists) {
//             skipped++;
//             continue;
//           }
//         }

//         // Create Variant
//         await ProductVariant.create({
//           product: product._id,

//           color: row.color?.trim() || "Default",

//           size: row.size?.trim() || "Free Size",

//           priceSource: "CUSTOM",

//           mrp: Number(row.selling_price || 0),

//           sellingPrice: Number(row.selling_price || 0),

//           sku: row.barcode?.trim() || `SKU-${Date.now()}`,

//           barcode: row.barcode?.trim() || undefined,

//           stock: Number(row.opening_stock_qty || 0),

//           sold: 0,

//           media: [DEFAULT_MEDIA_ID],

//           isActive: true,
//         });

//         variantsCreated++;
//       } catch (error) {
//         console.error(`❌ Error Row: ${row.name}`, error.message);
//       }
//     }

//     return Response.json({
//       success: true,
//       totalRows: rows.length,
//       productsCreated,
//       variantsCreated,
//       skipped,
//     });
//   } catch (error) {
//     console.error(error);

//     return Response.json(
//       {
//         success: false,
//         message: error.message,
//       },
//       { status: 500 },
//     );
//   }
// }
