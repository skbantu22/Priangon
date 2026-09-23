import axios from "axios";

// React Query options shared by the partner portal pages
export const partnerMeQuery = {
  queryKey: ["partner-me"],
  queryFn: async () => {
    const { data } = await axios.get("/api/partner/me");
    return data;
  },
  staleTime: 60 * 1000,
};

export const partnerOrdersQuery = {
  queryKey: ["partner-orders"],
  queryFn: async () => {
    const { data } = await axios.get("/api/partner/orders");
    return data;
  },
  staleTime: 30 * 1000,
};

export const money = (n) =>
  `৳${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
