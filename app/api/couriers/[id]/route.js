import { connectDB } from "@/lib/databaseconnection";
import Courier from "@/models/Courier.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function PUT(req, { params }) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  await connectDB();

  const body = await req.json();

  const updated = await Courier.findByIdAndUpdate(params.id, body, {
    new: true,
  });

  return Response.json({ success: true, data: updated });
}

export async function DELETE(req, { params }) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  await connectDB();

  await Courier.findByIdAndDelete(params.id);

  return Response.json({ success: true, message: "Deleted" });
}
