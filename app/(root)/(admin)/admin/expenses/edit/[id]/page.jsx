"use client";

import { useParams } from "next/navigation";

import ExpenseForm from "@/components/ui/Application/Admin/expense/ExpenseForm";

export default function EditExpensePage() {
  const { id } = useParams();

  return <ExpenseForm id={id} />;
}
