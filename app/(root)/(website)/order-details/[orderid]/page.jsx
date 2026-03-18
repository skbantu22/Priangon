import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { WEBSITE_PRODUCT_DETAILS } from "@/Route/Websiteroute";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import placeholderImg from "@/public/assets/img-placeholder.webp";

const OrderDetails = async ({ params }) => {
  const { orderid } =await  params; // no await needed

  const { data: orderData } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/orders/get/${orderid}`
  );

  const breadCrumbData = [
    { label: "Home", href: "/" },
    { label: "Orders" },
    { label: "Order Details" },
  ];

  const order = orderData?.data;

  if (!order) {
    return (
      <div className="flex justify-center items-center py-32">
        <h4 className="text-red-500 text-xl font-semibold">Order Not Found</h4>
      </div>
    );
  }

  return (
    <div className="lg:px-32 px-5 my-20">
      <Breadcums items={breadCrumbData} />

      <div className="my-5">
        <p>
          <b>Order Number:</b> {order.orderNumber}
        </p>
        <p>
          <b>Status:</b> {order.status}
        </p>
      </div>

      <table className="w-full border border-gray-200">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-3 text-start">Product</th>
            <th className="p-3 text-center">Price</th>
            <th className="p-3 text-center">Quantity</th>
            <th className="p-3 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.variantId._id} className="border-b">
              <td className="p-3">
                <div className="flex items-center gap-5">
                  <Image
                    src={item.variantId?.media?.[0]?.secure_url || placeholderImg.src}
                    width={60}
                    height={60}
                    alt={item.name || item.productId.name}
                    className="rounded"
                  />
                  <div>
                    <Link
                      href={WEBSITE_PRODUCT_DETAILS(item.productId.slug)}
                      className="text-lg font-medium line-clamp-1"
                    >
                      {item.productId.name}
                    </Link>
                    <p>Color: {item.color}</p>
                    <p>Size: {item.size}</p>
                  </div>
                </div>
              </td>
              <td className="text-center p-3">
                {item.sellingPrice.toLocaleString("en-BD", {
                  style: "currency",
                  currency: "BDT",
                  minimumFractionDigits: 0,
                })}
              </td>
              <td className="text-center p-3">{item.quantity}</td>
              <td className="text-center p-3">
                {(item.quantity * item.sellingPrice).toLocaleString("en-BD", {
                  style: "currency",
                  currency: "BDT",
                })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={3} className="text-end p-3">
              Subtotal:
            </td>
            <td className="text-center p-3">
              {order.subtotal.toLocaleString("en-BD", {
                style: "currency",
                currency: "BDT",
              })}
            </td>
          </tr>
          <tr className="font-semibold">
            <td colSpan={3} className="text-end p-3">
              Shipping Fee:
            </td>
            <td className="text-center p-3">
              {order.shippingFee.toLocaleString("en-BD", {
                style: "currency",
                currency: "BDT",
              })}
            </td>
          </tr>
          {order.discount > 0 && (
            <tr className="font-semibold">
              <td colSpan={3} className="text-end p-3">
                Discount:
              </td>
              <td className="text-center p-3">
                {order.discount.toLocaleString("en-BD", {
                  style: "currency",
                  currency: "BDT",
                })}
              </td>
            </tr>
          )}
          <tr className="font-bold bg-gray-100">
            <td colSpan={3} className="text-end p-3">
              Total:
            </td>
            <td className="text-center p-3">
              {order.total.toLocaleString("en-BD", {
                style: "currency",
                currency: "BDT",
              })}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-2">Customer Info</h3>
        <p>
          <b>Name:</b> {order.customer.name}
        </p>
        <p>
          <b>Phone:</b> {order.customer.phone}
        </p>
        <p>
          <b>Address:</b> {order.customer.address}, {order.customer.cityId}
        </p>
      </div>
    </div>
  );
};

export default OrderDetails;