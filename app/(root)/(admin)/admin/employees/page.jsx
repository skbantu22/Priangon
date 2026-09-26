"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { PlusSquare } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_EMPLOYEE_ADD, ADMIN_EMPLOYEE_EDIT } from "@/Route/Adminpannelroute";
import {
  ActionMenu,
  EmptyRow,
  ExportButtons,
  ListCard,
  btn,
  exportExcel,
  exportPdf,
  fmtDate,
  inputClass,
  money,
  printTable,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

const COLUMNS = ["SI", "Name", "Designation", "Branch", "Mobile", "Email", "Joining Date", "Salary", "Status"];

const Avatar = ({ employee, size = 38 }) =>
  employee.picture?.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={employee.picture.url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-[#e8f3ec] text-[13px] font-bold text-[#00801a]">
      {employee.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );

/** Employees → Employee List, like 360's */
export default function EmployeeListPage() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ showroomId: "", status: "", search: "" });

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    axios
      .get("/api/employees", { params })
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data.success ? data.data : []);
        if (!data.success) showToast("error", data.message);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows([]);
        showToast("error", error.response?.data?.message || "Could not load employees");
      });
    return () => {
      cancelled = true;
    };
  }, [filters, version]);

  useEffect(() => {
    axios
      .get("/api/showrooms")
      .then(({ data }) => data.success && setBranches(data.showrooms || []))
      .catch(() => {});
  }, []);

  const act = async (request) => {
    try {
      const { data } = await request();
      showToast(data.success ? "success" : "error", data.message);
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Action failed");
    }
  };

  const totalSalary = useMemo(() => (rows || []).filter((r) => r.isActive).reduce((sum, r) => sum + (r.salary || 0), 0), [rows]);

  const exportRows = () =>
    (rows || []).map((e, i) => [
      i + 1,
      e.name,
      e.designation,
      e.showroomId?.name || "Head Office",
      e.mobile,
      e.email || "",
      fmtDate(e.joiningDate),
      e.salary,
      e.isActive ? "Active" : "Inactive",
    ]);

  return (
    <ListCard
      title="Employee List"
      actions={
        <Link href={ADMIN_EMPLOYEE_ADD} className={btn.primary}>
          <PlusSquare size={14} /> Add New Employee
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.showroomId} onChange={(e) => setFilters({ ...filters, showroomId: e.target.value })} className={`${inputClass} !w-44`} aria-label="Branch">
          <option value="">All Branch</option>
          <option value="head">Head Office</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={`${inputClass} !w-36`} aria-label="Status">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search name, mobile, designation"
          className={`${inputClass} min-w-[200px] flex-1`}
        />
      </div>

      <div className="mt-4">
        <ExportButtons
          disabled={!rows?.length}
          onPdf={() => exportPdf("Employee List", COLUMNS, exportRows())}
          onExcel={() => exportExcel("Employees.xlsx", COLUMNS, exportRows())}
          onPrint={() => {
            if (!printTable("Employee List", COLUMNS, exportRows())) showToast("error", "Allow pop-ups to print");
          }}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["SI", "Employee", "Designation", "Branch", "Mobile", "Joining Date", "Salary", "Status", "Action"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows &&
              [1, 2, 3].map((n) => (
                <tr key={n}>
                  <td colSpan={9} className={tdClass}>
                    <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {rows && !rows.length && <EmptyRow colSpan={9} title="No employees yet" hint="Add your first employee." />}
            {rows?.map((e, i) => (
              <tr key={e._id} className={e.isActive ? "hover:bg-[#f5f7f9] dark:hover:bg-muted/50" : "bg-[#fafafa] text-[#98a6ad] dark:bg-muted/30"}>
                <td className={tdClass}>{i + 1}</td>
                <td className={tdClass}>
                  <span className="flex items-center gap-2">
                    <Avatar employee={e} />
                    <span>
                      <b className="block font-medium">{e.name}</b>
                      {e.email && <span className="block text-[12px] text-[#98a6ad]">{e.email}</span>}
                    </span>
                  </span>
                </td>
                <td className={tdClass}>{e.designation}</td>
                <td className={tdClass}>{e.showroomId?.name || "Head Office"}</td>
                <td className={tdClass}>{e.mobile}</td>
                <td className={tdClass}>{fmtDate(e.joiningDate)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{money(e.salary)}</td>
                <td className={tdClass}>
                  <span className={`px-[7px] py-[2px] text-[12px] font-semibold text-white ${e.isActive ? "bg-[#10b759]" : "bg-[#98a6ad]"}`}>
                    {e.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className={tdClass}>
                  <ActionMenu
                    items={[
                      ["Edit", () => router.push(ADMIN_EMPLOYEE_EDIT(e._id))],
                      [e.isActive ? "Make Inactive" : "Make Active", () => act(() => axios.patch(`/api/employees/${e._id}`, { isActive: !e.isActive }))],
                      ["Delete", () => confirm(`Delete ${e.name}?`) && act(() => axios.delete(`/api/employees/${e._id}`)), "danger"],
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {rows?.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={6} className={`${tdClass} text-right`}>
                  Monthly salary (active)
                </td>
                <td className={`${tdClass} text-right`}>{money(totalSalary)}</td>
                <td colSpan={2} className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ListCard>
  );
}
