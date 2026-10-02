import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { TRASH_RETENTION_DAYS } from "@/lib/trash";
import { purgeExpiredTrash } from "@/lib/trash.server";

/**
 * Lets a scheduler run the sweep without a login.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; any other scheduler
 * can send the same header or `x-cron-secret`. With no CRON_SECRET set
 * nothing is trusted and the caller has to be signed in.
 */
function fromScheduler(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";

  return header === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

async function run(request) {
  try {
    if (!fromScheduler(request)) {
      const auth = await requirePermission("trash.restore");
      if (auth.response) return auth.response;
    }

    await connectDB();

    const { cutoff, removed, total } = await purgeExpiredTrash();

    return NextResponse.json({
      success: true,
      message: total
        ? `${total} item(s) older than ${TRASH_RETENTION_DAYS} days deleted`
        : `Nothing older than ${TRASH_RETENTION_DAYS} days`,
      retentionDays: TRASH_RETENTION_DAYS,
      cutoff,
      removed,
      total,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET is what cron services call, POST is the button on the trash screen
export const GET = run;
export const POST = run;
