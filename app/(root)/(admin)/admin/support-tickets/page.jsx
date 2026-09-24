"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiSearch, FiSend, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_SUPPORT_TICKETS,
} from "@/Route/Adminpannelroute";
import {
  bdOperator,
  formatDateTimeBD,
  isValidBdMobile,
  isValidIMEI,
} from "@/lib/bdFormat";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_SUPPORT_TICKETS, label: "Support Tickets" },
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const STATUSES = [
  "open",
  "in-progress",
  "waiting-customer",
  "resolved",
  "closed",
];

const CATEGORIES = ["warranty", "delivery", "payment", "product", "other"];

const PRIORITIES = ["low", "medium", "high", "urgent"];

const statusVariant = {
  open: "destructive",
  "in-progress": "default",
  "waiting-customer": "secondary",
  resolved: "outline",
  closed: "outline",
};

const priorityVariant = {
  urgent: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const emptyForm = {
  customerName: "",
  phone: "",
  email: "",
  subject: "",
  description: "",
  category: "warranty",
  priority: "medium",
  orderNumber: "",
  imei: "",
  assignedTo: "",
};

const SupportTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ status, category });

      if (search.trim()) params.set("search", search.trim());

      const { data } = await axios.get(
        `/api/support-ticket?${params.toString()}`,
      );

      if (data.success) {
        setTickets(data.data);
        setCounts(data.counts || {});
      } else {
        showToast("error", data.message || "Could not load tickets");
      }
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load tickets",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, category]);

  useEffect(() => {
    const timer = setTimeout(loadTickets, 250);

    return () => clearTimeout(timer);
  }, [loadTickets]);

  const phoneError =
    form.phone && !isValidBdMobile(form.phone)
      ? "Use a Bangladeshi mobile number, e.g. 01712345678"
      : "";

  const imeiError =
    form.imei && !isValidIMEI(form.imei)
      ? "IMEI must be 15 digits and pass its check digit"
      : "";

  const createTicket = async () => {
    if (!form.customerName.trim() || !form.subject.trim()) {
      showToast("error", "Customer name and subject are required");
      return;
    }

    if (!isValidBdMobile(form.phone)) {
      showToast("error", "Enter a Bangladeshi mobile number");
      return;
    }

    if (imeiError) {
      showToast("error", imeiError);
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post("/api/support-ticket/create", form);

      if (!data.success) {
        showToast("error", data.message || "Could not create ticket");
        return;
      }

      showToast("success", `${data.data.ticketNumber} created`);
      setCreateOpen(false);
      setForm(emptyForm);
      loadTickets();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not create ticket",
      );
    } finally {
      setSaving(false);
    }
  };

  const patchTicket = async (ticket, patch) => {
    try {
      const { data } = await axios.put(
        `/api/support-ticket/update/${ticket._id}`,
        patch,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not update ticket");
        return;
      }

      if (active?._id === ticket._id) setActive(data.data);

      loadTickets();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not update ticket",
      );
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;

    try {
      const { data } = await axios.post(
        `/api/support-ticket/reply/${active._id}`,
        { body: reply, authorType: "staff" },
      );

      if (!data.success) {
        showToast("error", data.message || "Could not send reply");
        return;
      }

      setActive(data.data);
      setReply("");
      loadTickets();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not send reply",
      );
    }
  };

  const deleteTicket = async (ticket) => {
    if (!confirm(`Move ${ticket.ticketNumber} to trash?`)) return;

    try {
      const { data } = await axios.delete(
        `/api/support-ticket/delete/${ticket._id}`,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not delete ticket");
        return;
      }

      showToast("success", "Ticket moved to trash");
      setActive(null);
      loadTickets();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete ticket",
      );
    }
  };

  const openCount = (counts.open || 0) + (counts["in-progress"] || 0);

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h4 className="text-xl font-semibold">Support Tickets</h4>
            <p className="text-sm text-muted-foreground">
              {openCount} still need attention
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ticket, name, phone, IMEI"
                className="pl-9 w-full sm:w-60"
              />
            </div>

            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All status</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All types</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <Button onClick={() => setCreateOpen(true)}>
              <FiPlus className="mr-2" />
              New Ticket
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No ticket found. Open one when a customer reports a problem.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket._id}
                      className="cursor-pointer"
                      onClick={() => setActive(ticket)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {ticket.ticketNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTimeBD(ticket.createdAt)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>{ticket.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {ticket.phone}
                          {bdOperator(ticket.phone)
                            ? ` · ${bdOperator(ticket.phone)}`
                            : ""}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[240px] truncate">
                        {ticket.subject}
                      </TableCell>

                      <TableCell className="capitalize">
                        {ticket.category}
                      </TableCell>

                      <TableCell>
                        <Badge variant={priorityVariant[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusVariant[ticket.status]}>
                          {ticket.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTicket(ticket);
                          }}
                        >
                          <FiTrash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-name">Customer Name</Label>
                <Input
                  id="ticket-name"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-phone">Phone</Label>
                <Input
                  id="ticket-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01712345678"
                />
                {phoneError ? (
                  <p className="text-xs text-destructive">{phoneError}</p>
                ) : (
                  form.phone &&
                  bdOperator(form.phone) && (
                    <p className="text-xs text-muted-foreground">
                      {bdOperator(form.phone)}
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Handset restarts by itself"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-desc">What happened</Label>
              <Textarea
                id="ticket-desc"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ticket-cat">Type</Label>
                <select
                  id="ticket-cat"
                  className={`${selectClass} w-full`}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-priority">Priority</Label>
                <select
                  id="ticket-priority"
                  className={`${selectClass} w-full`}
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-assigned">Assigned To</Label>
                <Input
                  id="ticket-assigned"
                  value={form.assignedTo}
                  onChange={(e) =>
                    setForm({ ...form, assignedTo: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-order">Order Number</Label>
                <Input
                  id="ticket-order"
                  value={form.orderNumber}
                  onChange={(e) =>
                    setForm({ ...form, orderNumber: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-imei">IMEI</Label>
                <Input
                  id="ticket-imei"
                  value={form.imei}
                  onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  placeholder="15 digits"
                />
                {imeiError && (
                  <p className="text-xs text-destructive">{imeiError}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>

            <Button onClick={createTicket} disabled={saving}>
              {saving ? "Saving..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {active?.ticketNumber} — {active?.subject}
            </DialogTitle>
          </DialogHeader>

          {active && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{active.customerName}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{active.phone}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Order</p>
                  <p className="font-medium">{active.orderNumber || "—"}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">IMEI</p>
                  <p className="font-medium">{active.imei || "—"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  className={selectClass}
                  value={active.status}
                  onChange={(e) =>
                    patchTicket(active, { status: e.target.value })
                  }
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                <select
                  className={selectClass}
                  value={active.priority}
                  onChange={(e) =>
                    patchTicket(active, { priority: e.target.value })
                  }
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-64 space-y-3 overflow-y-auto rounded border p-3">
                {active.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No message yet.
                  </p>
                ) : (
                  active.messages.map((message) => (
                    <div
                      key={message._id}
                      className={`rounded-lg p-3 text-sm ${
                        message.authorType === "staff"
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {message.author ||
                            (message.authorType === "staff"
                              ? "Staff"
                              : "Customer")}
                        </span>
                        <span>{formatDateTimeBD(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                />

                <Button onClick={sendReply} disabled={!reply.trim()}>
                  <FiSend />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTicketsPage;
