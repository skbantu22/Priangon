import { NextResponse } from "next/server";

import VatGroupModel from "@/models/VatGroup.model";
import { connectDB } from "@/lib/databaseconnection";
import { exactRegex } from "@/lib/escapeRegex";
import { ADMIN_ONLY, STAFF_ROLES, requireRoles } from "@/lib/apiAuth";
import { readVatGroup } from "@/lib/vatGroups";

const fail = (message, status = 400) => NextResponse.json({ success: false, message }, { status });

// GET: every group, for the settings list and the product form
export async function GET() {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  await connectDB();
  const groups = await VatGroupModel.find({ deletedAt: null }).sort({ percent: 1, name: 1 }).lean();
  return NextResponse.json({ success: true, data: groups });
}

// POST { name, percent }
export async function POST(req) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const group = readVatGroup(await req.json());
    if (group.error) return fail(group.error);
    if (await VatGroupModel.exists({ name: exactRegex(group.name), deletedAt: null })) {
      return fail("A group with this name already exists", 409);
    }

    const created = await VatGroupModel.create(group);
    return NextResponse.json({ success: true, message: "VAT group added", data: created }, { status: 201 });
  } catch (error) {
    return fail(error.message, 500);
  }
}
