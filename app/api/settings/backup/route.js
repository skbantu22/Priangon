import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import { backupFileName, buildBackup, restoreBackup } from "@/lib/backup.server";

// a whole-database dump outstays the default serverless slice
export const maxDuration = 300;

/** Settings → Backup: download everything as one Extended JSON file */
export async function GET() {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { json } = await buildBackup();
    const name = backupFileName(mongoose.connection.db.databaseName);

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Settings → Backup: put an uploaded backup file back */
export async function POST(request) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    const form = await request.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "replace" ? "replace" : "merge";

    if (!file || typeof file.text !== "function") {
      return NextResponse.json({ success: false, message: "Choose a backup file" }, { status: 400 });
    }

    const text = await file.text();

    await connectDB();

    const result = await restoreBackup(text, { mode });

    return NextResponse.json({
      success: true,
      message: `${result.total} record(s) restored into ${Object.keys(result.restored).length} collection(s)`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
