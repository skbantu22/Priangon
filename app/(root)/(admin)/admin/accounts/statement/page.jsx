import AccountStatement from "@/components/ui/Application/Admin/accounts/AccountStatement";

export default async function AccountStatementPage({ searchParams }) {
  const query = await searchParams;
  return <AccountStatement initialId={query?.id || ""} />;
}
