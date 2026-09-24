import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
export async function GET(req) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category"); // "men" / "women" / "" / null

  const products = [
    { id: 1, name: "Men Shirt", category: "men" },
    { id: 2, name: "Men Hoodie", category: "men" },
    { id: 3, name: "Women Dress", category: "women" },
    { id: 4, name: "Kids Jacket", category: "kids" },
  ];

  let result = products;

  if (category) {
    result = products.filter((p) => p.category === category);
  }

  return Response.json(result);
}
