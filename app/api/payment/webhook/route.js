export async function POST(req) {
  const data = await req.json();

  const order = await OrderModel.findById(data.orderId);

  if (!order) return;

  order.status = "processing";
  order.paymentStatus = "paid";

  await order.save();

  // NOW CREATE COURIER
  const response = await steadfast.post("/create_order", {
    invoice: order.orderNumber,
    recipient_name: order.customer.name,
    recipient_phone: order.customer.phone,
    recipient_address: order.customer.address,
    cod_amount: order.total,
  });

  await OrderModel.findByIdAndUpdate(order._id, {
    courier: {
      name: "steadfast",
      status: "created",
      consignmentId: response.data?.consignment?.consignment_id,
      trackingCode: response.data?.consignment?.tracking_code,
    },
  });
}
