import { connectDB } from "@/lib/databaseconnection";
import Product from "@/models/Product.model";
import ShowroomStock from "@/models/ShowroomStock";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId");
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    // শোরুম ফিল্টার ভ্যালিডেশন চেক
    const hasSpecificShowroom =
      showroomId &&
      showroomId !== "all" &&
      showroomId !== "undefined" &&
      showroomId.trim() !== "";

    // ==========================================
    // ১. শোরুমের স্টক ডাটা তুলে আনা
    // ==========================================
    const stockFilter = {};
    if (hasSpecificShowroom) {
      stockFilter.showroomId = showroomId;
    }

    const allStocks = await ShowroomStock.find(stockFilter).lean();

    // স্টক ডাটা দ্রুত ম্যাপ করার জন্য সেটআপ
    const stockMap = new Map();
    const activeProductIds = new Set();

    for (const stockItem of allStocks) {
      const vid = stockItem.variantId ? stockItem.variantId.toString() : null;
      const pid = stockItem.productId ? stockItem.productId.toString() : null;

      if (vid) {
        const current = stockMap.get(vid) || 0;
        stockMap.set(vid, current + Number(stockItem.stock || 0));
      }
      if (pid) {
        activeProductIds.add(pid);
      }
    }

    // ==========================================
    // ২. প্রোডাক্ট মডেল থেকে ডাটা তুলে আনা
    // ==========================================
    const productQuery = { deletedAt: null };

    // 💡 এখানে ফিল্টারটি অন থাকবে, যাতে নির্দিষ্ট শোরুম সিলেক্ট করলে কেবল সেই শোরুমের প্রোডাক্টগুলোই আসে
    if (hasSpecificShowroom) {
      productQuery._id = { $in: Array.from(activeProductIds) };
    }

    const allProducts = await Product.find(productQuery)
      .populate({
        path: "media",
        select: "secure_url",
      })
      .populate({
        path: "variants",
        select: "color size sku barcode mrp sellingPrice",
      })
      .lean();

    // ==========================================
    // ৩. প্রোডাক্টের সাথে স্টক সাজানো (জিরো স্টক সহ)
    // ==========================================
    const processedItems = allProducts.map((product) => {
      const formattedVariants = (product.variants || []).map((variant) => {
        const vid = variant._id ? variant._id.toString() : "";
        const stockValue = stockMap.get(vid) || 0;

        return {
          ...variant,
          showroomStock: stockValue, // স্টক ০ হলেও ভ্যালু ০ হিসেবেই পাস হবে, ভ্যারিয়েন্ট ডিলিট হবে না
        };
      });

      return {
        productId: {
          _id: product._id,
          name: product.name,
          sellingPrice: product.sellingPrice || 0,
          media: Array.isArray(product.media) ? product.media : [],
        },
        variants: formattedVariants, // কোনো ফিল্টার ছাড়া সব ভ্যারিয়েন্ট যাবে
      };
    });

    // 💡 এখানে কোনো filter() করা হবে না, যাতে ভ্যারিয়েন্টের স্টক ০ হলেও প্রোডাক্টটি লিস্টে থাকে
    const items = processedItems.filter((item) => {
      if (!item.productId) return false;
      if (!q) return true;

      const productName = (item.productId.name || "").toLowerCase();

      const matchVariant = item.variants.some((v) => {
        const barcode = (v.barcode || "").toLowerCase();
        const sku = (v.sku || "").toLowerCase();
        return barcode === q || sku === q;
      });

      return productName.includes(q) || matchVariant;
    });

    return Response.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("POS API ERROR:", error);
    return Response.json(
      { success: false, message: "Server Error" },
      { status: 500 },
    );
  }
}
