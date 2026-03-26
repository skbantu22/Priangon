// app/api/admin/tracking/route.js
import { connectDB } from "@/lib/databaseconnection";
import FBTrackingSettingsModel from "@/models/FbTrackingSetting.model";

export async function GET() {
  try {
    await connectDB();

    let settings = await FBTrackingSettingsModel.findOne();

    if (!settings) {
      settings = await FBTrackingSettingsModel.create({});
    }

    return new Response(JSON.stringify({ success: true, data: settings }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const settings = await FBTrackingSettingsModel.findOneAndUpdate(
      {},
      {
        meta: {
          pixelId: body.meta.pixelId,
          accessToken: body.meta.accessToken,
          testEventCode: body.meta.testEventCode,
          enabled: body.meta.enabled,
        },
      },
      { upsert: true, new: true },
    );

    return new Response(JSON.stringify({ success: true, data: settings }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error in POST /tracking:", err);

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
}
