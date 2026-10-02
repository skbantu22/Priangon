import PartyStatement from "@/components/ui/Application/Admin/telekhata/PartyStatement";

const TYPES = ["customer", "supplier", "employee"];

export default async function PartyStatementPage({ params, searchParams }) {
  const { type, id } = await params;
  const query = await searchParams;
  return <PartyStatement type={TYPES.includes(type) ? type : "customer"} id={id} askKind={query?.new === "1"} />;
}
