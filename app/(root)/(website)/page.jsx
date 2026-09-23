import { redirect } from "next/navigation";

// There is no public storefront: the home page goes straight to staff login
// (proxy.js normally redirects before this renders).
export default function Home() {
  redirect("/auth/login");
}
