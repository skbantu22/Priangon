"use client";

import { useParams } from "next/navigation";

import EmployeeForm from "@/components/ui/Application/Admin/employee/EmployeeForm";

export default function EditEmployeePage() {
  const { id } = useParams();

  return <EmployeeForm id={id} />;
}
