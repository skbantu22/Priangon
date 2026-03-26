import { connectDB } from "@/lib/databaseconnection";
import MediaModel from "@/models/Media.model";
import Product from "@/models/Product.model";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) return Response.json({ products: [], categories: [] });

  // Product search using 'name'
  const products = await Product.find({
    name: { $regex: q, $options: "i" }, // <-- এখানে 'name' ব্যবহার করুন
  })
    .populate("media")
    .limit(10)
    .lean();

  // Category search (populate categories if needed)
  const categories = await Product.aggregate([
    { $match: { category: { $regex: q, $options: "i" } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $limit: 5 },
  ]);

  return Response.json({ products, categories });
}
