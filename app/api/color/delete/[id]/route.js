import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
// import { NextResponse } from "next/server";
// import ColorModel from "@/models/ColorModel";
// import { connectDB } from "@/lib/databaseconnection";

// export async function DELETE(req, { params }) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

//   try {
//     await connectDB();

//     const { id } = await params;

//     await ColorModel.findByIdAndDelete(id);

//     return NextResponse.json({
//       success: true,
//       message: "Color deleted successfully",
//     });
//   } catch (error) {
//     return NextResponse.json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
