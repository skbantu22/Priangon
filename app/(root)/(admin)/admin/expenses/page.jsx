"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiEdit2, FiPlus, FiSearch, FiTag, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { formatDateBD, formatTaka } from "@/lib/bdFormat";
import { ADMIN_DASHBOARD, ADMIN_EXPENSE_SHOW } from "@/Route/Adminpannelroute";

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
  { href: ADMIN_EXPENSE_SHOW, label: "Expenses" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const firstOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  categoryId: "",
  title: "",
  amount: "",
  expenseDate: today(),
  paymentMethod: "cash",
  reference: "",
  note: "",
};

const ExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/expense-category?active=true");

      if (data.success) setCategories(data.data);
    } catch {
      showToast("error", "Could not load expense categories");
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ from, to });

      if (categoryId) params.set("categoryId", categoryId);
      if (search.trim()) params.set("search", search.trim());

      const { data } = await axios.get(`/api/expense?${params.toString()}`);

      if (data.success) {
        setExpenses(data.data);
        setTotalAmount(data.totalAmount);
      } else {
        showToast("error", data.message || "Could not load expenses");
      }
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load expenses",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, categoryId, search]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(loadExpenses, 250);

    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?._id || "" });
    setOpen(true);
  };

  const openEdit = (expense) => {
    setEditingId(expense._id);
    setForm({
      categoryId: expense.categoryId,
      title: expense.title,
      amount: expense.amount,
      expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 10),
      paymentMethod: expense.paymentMethod,
      reference: expense.reference || "",
      note: expense.note || "",
    });
    setOpen(true);
  };

  const saveExpense = async () => {
    if (!form.categoryId) {
      showToast("error", "Select a category");
      return;
    }

    if (!form.title.trim()) {
      showToast("error", "Write what the money was spent on");
      return;
    }

    if (!(Number(form.amount) > 0)) {
      showToast("error", "Enter an amount more than zero");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/expense/update/${editingId}`, form)
        : await axios.post("/api/expense/create", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save expense");
        return;
      }

      showToast("success", editingId ? "Expense updated" : "Expense recorded");
      setOpen(false);
      loadExpenses();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save expense",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense) => {
    if (!confirm(`Move ${expense.voucherNumber} to trash?`)) return;

    try {
      const { data } = await axios.delete(`/api/expense/delete/${expense._id}`);

      if (!data.success) {
        showToast("error", data.message || "Could not delete expense");
        return;
      }

      showToast("success", "Expense moved to trash");
      loadExpenses();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete expense",
      );
    }
  };

  const saveCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const { data } = await axios.post("/api/expense-category/create", {
        name: newCategory.trim(),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not add category");
        return;
      }

      showToast("success", "Category added");
      setNewCategory("");
      loadCategories();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not add category",
      );
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h4 className="text-xl font-semibold">Expenses</h4>
            <p className="text-sm text-muted-foreground">
              {expenses.length} voucher · {formatTaka(totalAmount)} in this range
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Voucher or title"
                className="pl-9 w-full sm:w-48"
              />
            </div>

            <select
              className={`${selectClass} sm:w-44`}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
            />

            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
            />

            <Button variant="outline" onClick={() => setCategoryOpen(true)}>
              <FiTag className="mr-2" />
              Categories
            </Button>

            <Button onClick={openCreate}>
              <FiPlus className="mr-2" />
              New Expense
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
          ) : expenses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expense in this range. Record shop rent, salary, electricity
              and the rest so profit is the real number.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>
                        <div className="font-medium">
                          {expense.voucherNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateBD(expense.expenseDate)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>{expense.title}</div>
                        {expense.reference && (
                          <div className="text-xs text-muted-foreground">
                            {expense.reference}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>{expense.categoryName}</TableCell>

                      <TableCell className="capitalize">
                        {expense.paymentMethod}
                      </TableCell>

                      <TableCell className="text-right font-medium tabular-nums">
                        {formatTaka(expense.amount)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(expense)}
                          >
                            <FiEdit2 />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteExpense(expense)}
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Expense" : "New Expense"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-title">Spent on</Label>
              <Input
                id="expense-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Shop rent for this month"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) =>
                    setForm({ ...form, expenseDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expense-category">Category</Label>
                <select
                  id="expense-category"
                  className={selectClass}
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-method">Method</Label>
                <select
                  id="expense-method"
                  className={selectClass}
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-ref">Reference</Label>
              <Input
                id="expense-ref"
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                placeholder="Trx ID / receipt no"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-note">Note</Label>
              <Textarea
                id="expense-note"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveExpense} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Rent, Salary, Electricity..."
                onKeyDown={(e) => e.key === "Enter" && saveCategory()}
              />
              <Button onClick={saveCategory}>Add</Button>
            </div>

            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No category yet. Add the ones you spend on every month.
              </p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {categories.map((category) => (
                  <li
                    key={category._id}
                    className="rounded border px-3 py-2"
                  >
                    {category.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setCategoryOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensePage;
