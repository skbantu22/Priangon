export default async function createPathaoOrder(courier, order) {
  try {
    // Step 1: Get Access Token
    const authResponse = await fetch(
      `${courier.apiUrl}/aladdin/api/v1/issue-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          username: courier.apiKey,
          password: courier.secretKey,
        },
      },
    );

    const authData = await authResponse.json();

    if (!authData.access_token) {
      throw new Error("Pathao authentication failed");
    }

    // Step 2: Create Order
    const response = await fetch(`${courier.apiUrl}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        store_id: process.env.PATHAO_STORE_ID,

        recipient_name: order.customerName,
        recipient_phone: order.phone,
        recipient_address: order.address,

        delivery_type: 48,
        item_type: 2,

        special_instruction: "",

        item_quantity: order.items.length,
        item_weight: 0.5,

        amount_to_collect: order.totalAmount,
      }),
    });

    const data = await response.json();

    return {
      success: true,
      courier: "pathao",
      consignmentId: data?.data?.consignment_id,
      trackingCode: data?.data?.tracking_number,
      raw: data,
    };
  } catch (error) {
    console.error("Pathao Order Error:", error);

    return {
      success: false,
      message: error.message,
    };
  }
}
