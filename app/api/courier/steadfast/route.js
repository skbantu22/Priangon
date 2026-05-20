export async function POST(req) {
  try {
    const body = await req.json();

    const payload = {
      invoice: body.invoice,
      recipient_name: body.name,
      recipient_phone: body.phone,
      recipient_address: body.address,
      cod_amount: body.cod_amount,
      note: body.note || "",
    };
    const res = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.STEADFAST_API_KEY,
        "Secret-Key": process.env.STEADFAST_SECRET_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("STATUS:", res.status);
    console.log("RESPONSE:", data);

    // IMPORTANT: handle failure properly
    if (!res.ok || data.status !== 200) {
      return Response.json(
        {
          success: false,
          message: data?.message || "Steadfast API failed",
          courier: data,
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      courier: data,
    });
  } catch (err) {
    console.log("STEADFAST ERROR:", err);

    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 },
    );
  }
}
