import { hashData } from "@/lib/helpers/hash";

export const buildMetaPayload = (body, settings) => {
  // 1. Phone number formatting for Bangladesh (Ensuring 88 prefix)
  const rawPhone = body.phone ? body.phone.replace(/[^0-9]/g, "") : "";
  const formattedPhone = rawPhone.startsWith("88") ? rawPhone : `88${rawPhone}`;

  // 2. Log receipt for debugging (Fixed placement: must be outside the return object)
  console.log(
    `[META CAPI] Building Payload: ${body.event_name} | ID: ${body.event_id} | Value: ${body.custom_data?.value} BDT`,
  );

  return {
    data: [
      {
        event_name: body.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.event_id, // CRITICAL for deduplication
        action_source: "website",
        event_source_url: body.url,

        user_data: {
          // Meta API expects these as an ARRAY of hashed strings
          ph: [hashData(formattedPhone)],
          fn: [hashData(body.full_name?.toLowerCase().trim())],

          // ct = City, st = State/Province
          ct: [hashData(body.district?.toLowerCase().trim())], // Usually city goes here
          st: [hashData(body.district?.toLowerCase().trim())],

          // country must be 'bd' for Bangladesh
          country: [hashData("bd")],

          client_ip_address: body.ip_address,
          client_user_agent: body.user_agent,
          fbp: body.fbp || undefined,
          fbc: body.fbc || undefined,
        },

        custom_data: {
          value: Number(body.custom_data?.value || 0),
          currency: "BDT",
          content_ids: body.custom_data?.content_ids || [],
          content_type: "product",
          num_items: body.custom_data?.num_items || 1,
        },
      },
    ],
    // Test event code allows you to see events in 'Test Events' tab instantly
    test_event_code: settings?.meta?.testEventCode || undefined,
  };
};
