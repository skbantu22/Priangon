import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";
import CategoryModel from "@/models/category.model";
import SubcategoryModel from "@/models/subcategory.model";

export async function GET() {
  try {
    await connectDB();
   
      const sp = req.nextUrl.searchParams; 

      const categoryName=sp.get("category")



if (categoryName) {
  const category = await CategoryModel.findOne({ name: categoryName });
  if (category) filter.category = category._id;
}

    // Find products of that category
    const products = await ProductModel.find({
      category: category._id,
    })
      .populate("category", "name")
      .populate("subcategory", "name");

    return NextResponse.json({
      items: products,
      total: products.length,
    });

  } catch (err) {
    console.log("ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
