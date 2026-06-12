import { connectDB } from "@/lib/databaseconnection";
import Courier from "@/models/Courier.model";

export async function PUT(req, { params }) {
  await connectDB();

  const body = await req.json();

  const updated = await Courier.findByIdAndUpdate(params.id, body, {
    new: true,
  });

  return Response.json({ success: true, data: updated });
}

export async function DELETE(req, { params }) {
  await connectDB();

  await Courier.findByIdAndDelete(params.id);

  return Response.json({ success: true, message: "Deleted" });
}
