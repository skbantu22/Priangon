import { NextResponse } from "next/server";
import mongoose from "mongoose";
import slugify from "slugify";

import { connectDB } from "@/lib/databaseconnection";
import PracticeModel from "@/models/practice.model";

// ✅ GET: list all (optional search + pagination)
export async function GET(request) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const start = parseInt(searchParams.get("start") || "0", 10);
    const size = parseInt(searchParams.get("size") || "10", 10);

    const match = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const data = await PracticeModel.find(match)
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(size);

    const totalRowCount = await PracticeModel.countDocuments(match);

    return NextResponse.json({ success: true, data, meta: { totalRowCount } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ✅ POST: create
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    // ✅ If body is array → insertMany
    if (Array.isArray(body)) {
      const formatted = body.map((item) => ({
        name: item.name,
        slug: slugify(item.name, { lower: true, strict: true }),
        category: item.category,
      }));

      const data = await PracticeModel.insertMany(formatted);

      return NextResponse.json(
        { success: true, message: "Multiple inserted ✅", data },
        { status: 201 }
      );
    }

    // ✅ If single object → normal create
    const { name, category } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, message: "name and category are required" },
        { status: 400 }
      );
    }

    const slug = slugify(name, { lower: true, strict: true });

    const data = await PracticeModel.create({
      name,
      slug,
      category,
    });

    return NextResponse.json(
      { success: true, message: "Single inserted ✅", data },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


// ✅ PUT: update by id (query ?id=)
export async function PUT(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const update = {};

    if (body.name) {
      update.name = body.name;
      update.slug = slugify(body.name, { lower: true, strict: true });
    }
    if (body.category) update.category = body.category;

    const data = await PracticeModel.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE: hard delete by id (query ?id=)
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid id is required" },
        { status: 400 }
      );
    }

    const data = await PracticeModel.findByIdAndDelete(id);

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Deleted ✅", data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
