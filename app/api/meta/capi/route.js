import { connectDB } from "@/lib/databaseconnection";
import FBTrackingSettings from "@/models/FbTrackingSetting.model";
import { buildMetaPayload } from "@/lib/meta/capi";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const settings = await FBTrackingSettings.findOne();

    if (!settings?.meta?.enabled) {
      return new Response(JSON.stringify({ success: false }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = `https://graph.facebook.com/v18.0/${settings.meta.pixelId}/events?access_token=${settings.meta.accessToken}`;

    const payload = buildMetaPayload(body, settings);

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (settings.meta.debug) {
      console.log("META EVENT:", payload);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
