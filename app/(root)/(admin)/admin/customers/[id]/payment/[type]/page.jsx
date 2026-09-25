"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CalendarCheck, CreditCard, Hash, ReceiptText, WalletCards } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import {
  ADMIN_CUSTOMER_ADVANCE,
  ADMIN_CUSTOMER_DUE_DISMISS,
  ADMIN_CUSTOMER_DUE_PAID,
  ADMIN_CUSTOMER_DUE_RECEIVED,
} from "@/Route/Adminpannelroute";

import {
  PAYMENT_METHODS,
  btn,
  fmtDate,
  inputClass,
  money,
  tdClass,
  thClass,
  theadRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const TITLES = {
  receive: "Customer Due Receive",
  pay: "Customer Due Pay",
  dismiss: "Customer Due Dismiss",
  advance: "Customer Advance",
};

// Where each screen lands after saving
const DONE = {
  receive: ADMIN_CUSTOMER_DUE_RECEIVED,
  pay: ADMIN_CUSTOMER_DUE_PAID,
  dismiss: ADMIN_CUSTOMER_DUE_DISMISS,
  advance: ADMIN_CUSTOMER_ADVANCE,
};

const SUBMIT = { receive: "Receive", pay: "Pay", dismiss: "Dismiss", advance: "Save" };

const num = (value) => Number(value) || 0;
const today = () => new Date().toLocaleDateString("en-CA");

/** Receive, pay, dismiss or advance for one customer */
export default function CustomerPaymentPage({ params }) {
  const { id, type } = use(params);
  const router = useRouter();

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [alloc, setAlloc] = useState({});
  const [form, setForm] = useState({
    amount: "",
    refundAmount: "",
    method: "cash",
    date: today(),
    reference: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const withInvoices = type === "receive" || type === "dismiss";
  const title = TITLES[type];

  useEffect(() => {
    axios
      .get(`/api/customer/${id}`)
      .then(({ data }) => (data.success ? setCustomer(data.data) : showToast("error", data.message)))
      .catch((err) => showToast("error", err.response?.data?.message || "Customer not found"));

    if (withInvoices) {
      axios
        .get(`/api/customer/${id}/due-invoices`)
        .then(({ data }) => setInvoices(data.success ? data.data : []))
        .catch(() => setInvoices([]));
    }
  }, [id, withInvoices]);

  const allocated = useMemo(
    () => Object.values(alloc).reduce((sum, value) => sum + num(value), 0),
    [alloc],
  );

  if (!title) {
    return <p className="p-6 text-center text-red-600">Unknown payment type</p>;
  }

  const due = num(customer?.balance?.due);
  // receive and dismiss work on what the customer owes; pay on what the shop owes them
  const limit = type === "pay" ? Math.max(0, -due) : Math.max(0, due);
  const previousAdvance = num(customer?.balance?.advance);
  const totalAdvance = previousAdvance + num(form.amount) - num(form.refundAmount);

  const set = (key) => (event) => {
    setError("");
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const applyAlloc = (next) => {
    setAlloc(next);
    setError("");

    const total = Object.values(next).reduce((sum, value) => sum + num(value), 0);

    setForm((current) => ({ ...current, amount: total ? String(Math.round(total * 100) / 100) : "" }));
  };

  const setInvoiceAmount = (invoice, value) => {
    const next = { ...alloc };

    if (value === "") delete next[invoice.id];
    else next[invoice.id] = value;

    applyAlloc(next);
  };

  const allChecked = invoices?.length > 0 && invoices.every((invoice) => alloc[invoice.id] !== undefined);

  const toggleAll = () =>
    applyAlloc(
      allChecked ? {} : Object.fromEntries(invoices.map((invoice) => [invoice.id, String(invoice.due)])),
    );

  const submit = async (event) => {
    event.preventDefault();

    if (type === "advance") {
      if (!(num(form.amount) > 0) && !(num(form.refundAmount) > 0)) {
        setError("Enter an advance or a refund amount");
        return;
      }

      if (totalAdvance < -0.009) {
        setError("Refund cannot be more than the advance");
        return;
      }
    } else {
      if (!(num(form.amount) > 0)) {
        setError("Enter an amount greater than 0");
        return;
      }

      if (num(form.amount) - limit > 0.009) {
        setError(
          limit > 0
            ? `Only ${money(limit)} can be ${type === "receive" ? "received" : type === "pay" ? "paid" : "dismissed"}`
            : type === "pay"
              ? "The shop owes this customer nothing"
              : "This customer has no due. Take it as an advance instead.",
        );
        return;
      }
    }

    const over = withInvoices && invoices?.find((invoice) => num(alloc[invoice.id]) - invoice.due > 0.009);

    if (over) {
      setError(`${over.orderNumber}: only ${money(over.due)} is due`);
      return;
    }

    if (withInvoices && allocated - num(form.amount) > 0.009) {
      setError("Amount is less than the invoice amounts entered");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post("/api/customer-payments", {
        ...form,
        customerId: id,
        type,
        allocations: Object.entries(alloc)
          .filter(([, value]) => num(value) > 0)
          .map(([orderId, value]) => ({ orderId, amount: num(value) })),
      });

      if (!data.success) {
        setError(data.message);
        return;
      }

      showToast("success", data.message);
      router.push(DONE[type]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save payment");
    } finally {
      setSaving(false);
    }
  };

  const noun = type === "dismiss" ? "Dismiss" : type === "receive" ? "Receiving" : "Paying";

  return (
    <section className="rounded-[8px] border border-[#e6ebf1] bg-white px-[16px] py-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)] sm:px-[24px] sm:py-[24px] dark:border-border dark:bg-card">
      <h1 className="m-0 mb-[16px] text-[22px] font-semibold tracking-[-0.01em] text-[#212529] dark:text-foreground">
        {title}
      </h1>

      {!customer ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <dl className="grid w-fit grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
            <dt className="font-semibold">Name:</dt>
            <dd>
              {customer.name}
              {customer.businessName && <span className="text-muted-foreground"> ({customer.businessName})</span>}
            </dd>
            <dt className="font-semibold">Mobile:</dt>
            <dd>{customer.phone}</dd>
            <dt className="font-semibold">Type:</dt>
            <dd>{CUSTOMER_TYPES[customer.type]?.short}</dd>
            {customer.address && (
              <>
                <dt className="font-semibold">Address:</dt>
                <dd>{customer.address}</dd>
              </>
            )}
          </dl>

          {withInvoices && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className={theadRow}>
                    <th className={thClass}>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          disabled={!invoices?.length}
                          aria-label="Select all invoices"
                        />
                        Invoice No.
                      </label>
                    </th>
                    {["Date", "Invoice Amount", "Due Amount", `${noun} Amount`].map((head) => (
                      <th key={head} className={thClass}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices === null && (
                    <tr>
                      <td colSpan={5} className={tdClass}>
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  )}

                  {invoices?.length === 0 && (
                    <tr>
                      <td colSpan={5} className={`${tdClass} text-center text-muted-foreground`}>
                        No invoice has a due. The amount is recorded against the customer&apos;s balance.
                      </td>
                    </tr>
                  )}

                  {invoices?.map((invoice) => {
                    const checked = alloc[invoice.id] !== undefined;
                    const bad = num(alloc[invoice.id]) - invoice.due > 0.009;

                    return (
                      <tr key={invoice.id} className={checked ? "bg-blue-50 dark:bg-blue-950/30" : ""}>
                        <td className={tdClass}>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setInvoiceAmount(invoice, event.target.checked ? String(invoice.due) : "")
                              }
                            />
                            {invoice.orderNumber}
                          </label>
                        </td>
                        <td className={tdClass}>{fmtDate(invoice.date)}</td>
                        <td className={tdClass}>{money(invoice.total)}</td>
                        <td className={`${tdClass} font-semibold text-red-600`}>{money(invoice.due)}</td>
                        <td className={`${tdClass} py-1`}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={alloc[invoice.id] ?? ""}
                            onChange={(event) => setInvoiceAmount(invoice, event.target.value)}
                            className={`${inputClass} ${bad ? "!border-red-500" : ""}`}
                            aria-label={`${noun} amount for ${invoice.orderNumber}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {allocated > 0 && (
                  <tfoot>
                    <tr className="bg-muted font-semibold">
                      <td colSpan={4} className={tdClass}>
                        Selected invoices
                      </td>
                      <td className={tdClass}>{money(allocated)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <label htmlFor="p-note" className="mb-2 block text-sm font-medium">
                Note
              </label>
              <Textarea id="p-note" rows={5} value={form.note} onChange={set("note")} placeholder="Note" />
            </div>

            <div className="space-y-3">
              {type === "advance" ? (
                <>
                  <Row icon={ReceiptText} label="Previous Advance">
                    <input className={`${inputClass} bg-muted`} value={money(previousAdvance)} readOnly />
                  </Row>
                  <Row icon={WalletCards} label="Receiving Advance">
                    <input type="number" min="0" step="0.01" placeholder="0" className={inputClass} value={form.amount} onChange={set("amount")} />
                  </Row>
                  <Row icon={WalletCards} label="Refund Advance">
                    <input type="number" min="0" step="0.01" placeholder="0" className={inputClass} value={form.refundAmount} onChange={set("refundAmount")} />
                  </Row>
                  <Row icon={WalletCards} label="Total Advance">
                    <input
                      className={`${inputClass} bg-muted font-semibold ${totalAdvance < 0 ? "text-red-600" : ""}`}
                      value={money(totalAdvance)}
                      readOnly
                    />
                  </Row>
                </>
              ) : (
                <>
                  <Row icon={ReceiptText} label={type === "pay" ? "Total Payable" : "Total Receivable"}>
                    <input className={`${inputClass} bg-muted font-semibold`} value={money(limit)} readOnly />
                  </Row>
                  <Row icon={WalletCards} label={`${noun} Amount`}>
                    <input type="number" min="0" step="0.01" placeholder="Amount" className={inputClass} value={form.amount} onChange={set("amount")} />
                  </Row>
                </>
              )}

              <Row icon={CalendarCheck} label={type === "advance" ? "Date" : `${noun} Date`}>
                <input type="date" className={inputClass} value={form.date} onChange={set("date")} />
              </Row>

              {type !== "dismiss" && (
                <Row icon={CreditCard} label={type === "pay" ? "Paying With" : "Received In"}>
                  <select className={inputClass} value={form.method} onChange={set("method")}>
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Row>
              )}

              {type !== "dismiss" && form.method !== "cash" && (
                <Row icon={Hash} label={form.method === "cheque" ? "Cheque No." : "Reference"}>
                  <input
                    className={inputClass}
                    placeholder={form.method === "cheque" ? "Cheque number" : "Trx ID / reference"}
                    value={form.reference}
                    onChange={set("reference")}
                  />
                </Row>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40" role="alert">
              {error}
            </p>
          )}

          <div className="mt-[26px] flex justify-end gap-[8px]">
            <button type="button" className={btn.secondary} onClick={() => router.back()}>
              Back
            </button>
            <button type="submit" disabled={saving} className={`${btn.info} min-w-[96px] !py-[9px] !text-[15px]`}>
              {saving ? "Saving…" : SUBMIT[type]}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Label on the left, grey addon box and control on the right */
function Row({ icon: Icon, label, children }) {
  return (
    <label className="grid items-center gap-[6px] sm:grid-cols-[160px_1fr] sm:gap-[14px]">
      <span className="text-[15px] font-medium text-[#212529] dark:text-foreground">{label}</span>
      <span className="flex h-[46px] overflow-hidden rounded-[6px] border border-[#dde2e7] bg-white focus-within:border-[#188ae2] focus-within:ring-[3px] focus-within:ring-[#188ae2]/15 dark:border-input dark:bg-transparent [&>input]:h-full [&>input]:rounded-none [&>input]:border-0 [&>input]:!text-[15px] [&>input]:focus:ring-0 [&>select]:h-full [&>select]:rounded-none [&>select]:border-0 [&>select]:!text-[15px] [&>select]:focus:ring-0">
        <span className="flex w-[52px] shrink-0 items-center justify-center border-r border-[#dde2e7] bg-[#eef1f4] text-[#495057] dark:border-input dark:bg-muted">
          <Icon size={19} strokeWidth={1.8} />
        </span>
        {children}
      </span>
    </label>
  );
}
