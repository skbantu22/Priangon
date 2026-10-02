"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Banknote, CalendarCheck, CreditCard, Wallet } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_CUSTOMER_DUE_RECEIVED } from "@/Route/Adminpannelroute";
import { PAYMENT_METHODS, inputClass, money } from "@/components/ui/Application/Admin/supplier/supplierKit";

const num = (value) => Math.round((Number(value) || 0) * 100) / 100;
const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

/** Customer Due Receive Edit: move a receipt between the customer's invoices */
export default function CustomerDueReceiveEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [payment, setPayment] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    axios
      .get(`/api/customer-payments/${id}`, { params: { invoices: 1 } })
      .then(({ data }) => {
        if (cancelled) return;

        if (!data.success) {
          showToast("error", data.message || "Could not load the receipt");
          return;
        }

        setPayment(data.data);
        setAmount(String(data.data.amount));
        setDate(day(data.data.date));
        setMethod(data.data.method || "cash");
        setNote(data.data.note || "");
        setRows(
          data.invoices.map((row) => ({
            ...row,
            checked: row.share > 0,
            receiving: row.share > 0 ? String(row.share) : "",
          })),
        );
      })
      .catch((error) => showToast("error", error.response?.data?.message || "Could not load the receipt"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  const customer = payment?.customerId;
  const totalReceivable = rows.reduce((sum, row) => sum + row.totalDue, 0);

  // the receive amount follows the invoice rows once any row is ticked
  const syncAmount = (next) => {
    const picked = next.filter((row) => row.checked);

    if (picked.length) setAmount(String(num(picked.reduce((sum, row) => sum + num(row.receiving), 0))));
  };

  const updateRow = (orderId, patch) => {
    const next = rows.map((row) => {
      if (row.orderId !== orderId) return row;

      const merged = { ...row, ...patch };

      // ticking an invoice fills in what it can still take
      if (patch.checked === true && !num(merged.receiving)) merged.receiving = String(row.totalDue);
      if (patch.checked === false) merged.receiving = "";

      return merged;
    });

    setRows(next);
    syncAmount(next);
  };

  const toggleAll = (checked) => {
    const next = rows.map((row) => ({
      ...row,
      checked,
      receiving: checked ? String(num(row.receiving) || row.totalDue) : "",
    }));

    setRows(next);
    syncAmount(next);
  };

  const save = async (event) => {
    event.preventDefault();

    const allocations = rows
      .filter((row) => row.checked && num(row.receiving) > 0)
      .map((row) => ({ orderId: row.orderId, amount: num(row.receiving) }));

    setSaving(true);

    try {
      const { data } = await axios.put(`/api/customer-payments/${id}`, {
        amount: num(amount),
        date,
        method,
        note,
        allocations,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not update the receipt");
        return;
      }

      showToast("success", data.message || "Receipt updated");
      router.push(ADMIN_CUSTOMER_DUE_RECEIVED);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not update the receipt");
    } finally {
      setSaving(false);
    }
  };

  const allChecked = rows.length > 0 && rows.every((row) => row.checked);

  return (
    <section className="rounded-[2px] border border-[#e6ebf1] border-t-[3px] border-t-[#1bab70] bg-white px-4 py-5 shadow-sm sm:px-6 dark:border-border dark:bg-card">
      <h1 className="m-0 text-[20px] font-semibold text-[#212529] dark:text-foreground">Customer Due Receive Edit</h1>

      {loading && <div className="mt-6 h-24 animate-pulse rounded bg-slate-100 dark:bg-muted" />}

      {!loading && !payment && <p className="mt-6 text-sm text-muted-foreground">This receipt could not be found.</p>}

      {payment && (
        <form onSubmit={save} className="mt-4">
          <div className="space-y-0.5 text-[14px]">
            <p className="m-0">
              <b>Name:</b> {customer?.name}
            </p>
            {customer?.phone && (
              <p className="m-0">
                <b>Mobile:</b> {customer.phone}
              </p>
            )}
            {customer?.email && (
              <p className="m-0">
                <b>Email:</b> {customer.email}
              </p>
            )}
            <p className="m-0 text-muted-foreground">{payment.invoiceNo}</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#1ba463] text-left text-white">
                  <th className="border border-[#e6ebf1] px-3 py-2 font-semibold">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} />
                      Invoice No.
                    </label>
                  </th>
                  <th className="border border-[#e6ebf1] px-3 py-2 font-semibold">Invoice Type</th>
                  <th className="border border-[#e6ebf1] px-3 py-2 font-semibold">Invoice Amount</th>
                  <th className="border border-[#e6ebf1] px-3 py-2 font-semibold">Total Due Amount</th>
                  <th className="border border-[#e6ebf1] px-3 py-2 font-semibold">Current Due Amount</th>
                  <th className="border border-[#e6ebf1] px-3 py-2 font-semibold">Receiving Amount</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-[#e6ebf1] px-3 py-4 text-center text-muted-foreground">
                      This customer has no invoice with a due.
                    </td>
                  </tr>
                )}

                {rows.map((row) => (
                  <tr key={row.orderId}>
                    <td className="border border-[#e6ebf1] px-3 py-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={(event) => updateRow(row.orderId, { checked: event.target.checked })}
                        />
                        {row.orderNumber}
                      </label>
                    </td>
                    <td className="border border-[#e6ebf1] px-3 py-2">Sale</td>
                    <td className="border border-[#e6ebf1] px-3 py-2">{money(row.total)}</td>
                    <td className="border border-[#e6ebf1] px-3 py-2">{money(row.totalDue)}</td>
                    <td className="border border-[#e6ebf1] px-3 py-2">{money(row.currentDue)}</td>
                    <td className="border border-[#e6ebf1] px-3 py-1">
                      <input
                        type="number"
                        min="0"
                        max={row.totalDue}
                        step="0.01"
                        disabled={!row.checked}
                        value={row.receiving}
                        onChange={(event) => updateRow(row.orderId, { receiving: event.target.value })}
                        className={`${inputClass} !h-[36px] !w-[110px]`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <label className="block text-[14px]">
              Note
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note"
                rows={5}
                className={`${inputClass} mt-1 !h-auto w-full py-2`}
              />
            </label>

            <div className="space-y-3 text-[14px]">
              {[
                ["Total Receivable", Wallet, <input key="r" readOnly value={money(totalReceivable)} className={`${inputClass} w-full bg-[#e9ecef]`} />],
                [
                  "Receive Amount",
                  Banknote,
                  <input
                    key="a"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={`${inputClass} w-full`}
                  />,
                ],
                [
                  "Receive Date",
                  CalendarCheck,
                  <input key="d" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} w-full`} />,
                ],
                [
                  "Receive With",
                  CreditCard,
                  <select key="m" value={method} onChange={(event) => setMethod(event.target.value)} className={`${inputClass} w-full`}>
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>,
                ],
              ].map(([label, Icon, field]) => (
                <div key={label} className="grid grid-cols-[150px_1fr] items-center gap-3">
                  <span>{label}</span>
                  <div className="flex items-stretch">
                    <span className="flex w-[44px] items-center justify-center rounded-l-[4px] border border-r-0 border-[#ced4da] bg-[#e9ecef] text-[#495057]">
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 [&>*]:!rounded-l-none">{field}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push(ADMIN_CUSTOMER_DUE_RECEIVED)}
              className="h-[38px] rounded-[4px] border border-[#ced4da] px-5 text-[14px] hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-[38px] rounded-[4px] bg-[#35b8e0] px-6 text-[14px] font-medium text-white hover:bg-[#22a6cf] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
