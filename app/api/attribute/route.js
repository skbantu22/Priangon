import { NextResponse } from "next/server";
import AttributeModel from "@/models/Attribute.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    if (searchParams.get("active") === "true") filter.isActive = true;

    const slot = searchParams.get("slot");
    if (slot) filter.slot = slot;

    const attributes = await AttributeModel.find(filter).sort({ name: 1 });

    // Forms that only need the dropdown can ask for the values alone
    if (searchParams.get("format") === "options") {
      const options = attributes.flatMap((attribute) =>
        [...attribute.values]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({ label: item.label, value: item.value })),
      );

      return NextResponse.json({ success: true, data: options });
    }

    return NextResponse.json({ success: true, data: attributes });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
