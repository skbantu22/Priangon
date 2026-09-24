import { connectDB } from "@/lib/databaseconnection";
import { zSchema } from "@/lib/zodschema";
import CategoryModel from "@/models/category.model";
import { NextResponse } from "next/server";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function POST(request) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();

    const payload = await request.json();

    const schema = zSchema.pick({
      name: true,
      slug: true,
       subcategories: true, // just the key

     
    });

    const validate = schema.safeParse(payload);

    if (!validate.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or missing fields",
          errors: validate.error.format(),
        },
        { status: 400 }
      );
    }

    const { name, slug,subcategories } = validate.data;

    const exists = await CategoryModel.findOne({ slug });
    if (exists) {
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 409 }
      );
    }

    const created = await CategoryModel.create({ name, slug });

    return NextResponse.json(
      { success: true, message: "Category added successfully", data: created },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
