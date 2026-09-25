import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";
import { requireAnyPermission } from "@/lib/apiAuth";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/**
 * The supplier's invoice or challan, photographed or scanned, for a
 * purchase or a purchase order. The form uploads it first and saves the
 * returned url with the document.
 */
export async function POST(req) {
  try {
    const auth = await requireAnyPermission(["purchase.create", "purchase.order"]);
    if (auth.response) return auth.response;

    const file = (await req.formData()).get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "Choose a file" }, { status: 400 });
    }

    if (!TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Attach an image (PNG, JPG, WEBP) or a PDF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: "The attachment must be 4 MB or smaller" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "purchases", resource_type: "auto" }, (error, uploaded) =>
          error ? reject(error) : resolve(uploaded),
        )
        .end(buffer);
    });

    return NextResponse.json({
      success: true,
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
