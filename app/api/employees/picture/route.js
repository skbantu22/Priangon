import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";
import { requirePermission } from "@/lib/apiAuth";

const MAX_BYTES = 2 * 1024 * 1024;

/** Employee picture: JPG / PNG / WEBP up to 2 MB, like 360 */
export async function POST(req) {
  try {
    const auth = await requirePermission("employees.manage");
    if (auth.response) return auth.response;

    const file = (await req.formData()).get("file");

    if (!file || typeof file === "string" || !file.type?.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "Choose an image file (JPG or PNG)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: "The picture must be 2 MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "employees" }, (error, uploaded) => (error ? reject(error) : resolve(uploaded)))
        .end(buffer);
    });

    return NextResponse.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
