import { connectDB } from "@/lib/databaseconnection";
import Courier from "@/models/Courier.model";
import axios from "axios";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function POST(req) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  await connectDB();

  const { id } = await req.json();

  const courier = await Courier.findById(id);

  try {
    const testPayload = {
      invoice: "TEST-" + Date.now(),
      recipient_name: "Test User",
      recipient_phone: "01700000000",
      recipient_address: "Test Address",
      cod_amount: 100,
      note: "Test Order",
    };

    const res = await axios.post(courier.apiUrl, testPayload, {
      headers: {
        API_KEY: courier.apiKey,
        SECRET_KEY: courier.secretKey,
      },
    });

    return Response.json({
      success: true,
      message: "API working",
      response: res.data,
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: "API failed",
      error: error.message,
    });
  }
}
