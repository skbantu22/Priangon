import createSteadfastOrder from "./steadfast";
import createRedxOrder from "./redx";
import createPathaoOrder from "./pathao";

export async function createCourierOrder(courier, order) {
  switch (courier.slug) {
    case "steadfast":
      return createSteadfastOrder(courier, order);

    case "redx":
      return createRedxOrder(courier, order);

    case "pathao":
      return createPathaoOrder(courier, order);

    default:
      throw new Error(`Courier ${courier.slug} not supported`);
  }
}
