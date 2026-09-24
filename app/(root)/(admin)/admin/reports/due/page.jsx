"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { formatTaka } from "@/lib/bdFormat";
import { ADMIN_DASHBOARD, ADMIN_REPORT_DUE } from "@/Route/Adminpannelroute";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  { href: ADMIN_REPORT_DUE, label: "Due Report" },
];

const daysSince = (date) => {
  if (!date) return null;

  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );

  return days;
};

const AgeBadge = ({ date }) => {
  const days = daysSince(date);

  if (days === null) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant={days > 60 ? "destructive" : days > 30 ? "secondary" : "outline"}>
      {days} day{days === 1 ? "" : "s"}
    </Badge>
  );
};

const DueReportPage = () => {
  const [payable, setPayable] = useState([]);
  const [receivable, setReceivable] = useState([]);
  const [totalPayable, setTotalPayable] = useState(0);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("payable");

  const loadReport = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/reports/due");

      if (!data.success) {
        showToast("error", data.message || "Could not load the due report");
        return;
      }

      setPayable(data.payable || []);
      setReceivable(data.receivable || []);
      setTotalPayable(data.totalPayable || 0);
      setTotalReceivable(data.totalReceivable || 0);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load the due report",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const net = totalReceivable - totalPayable;

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FiArrowUpRight className="size-4" />
              We owe suppliers
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatTaka(totalPayable)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FiArrowDownLeft className="size-4" />
              Customers owe us
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatTaka(totalReceivable)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Net position</div>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                net < 0 ? "text-destructive" : ""
              }`}
            >
              {formatTaka(net)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {net < 0
                ? "More going out than coming in"
                : "More coming in than going out"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">Due Report</h4>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === "payable" ? "default" : "outline"}
              onClick={() => setTab("payable")}
            >
              Payable ({payable.length})
            </Button>

            <Button
              size="sm"
              variant={tab === "receivable" ? "default" : "outline"}
              onClick={() => setTab("receivable")}
            >
              Receivable ({receivable.length})
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
          ) : tab === "payable" ? (
            payable.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nothing owed to any supplier.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Purchase Due</TableHead>
                      <TableHead className="text-right">Total Due</TableHead>
                      <TableHead>Oldest</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {payable.map((row) => (
                      <TableRow key={String(row.supplierId)}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          {row.companyName && (
                            <div className="text-xs text-muted-foreground">
                              {row.companyName}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>{row.phone}</TableCell>

                        <TableCell className="text-right tabular-nums">
                          {row.openingBalance > 0
                            ? formatTaka(row.openingBalance)
                            : "—"}
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          {row.purchaseDue > 0 ? formatTaka(row.purchaseDue) : "—"}
                        </TableCell>

                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatTaka(row.totalDue)}
                        </TableCell>

                        <TableCell>
                          <AgeBadge date={row.oldestDueDate} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : receivable.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No customer is carrying a due.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Oldest</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {receivable.map((row, index) => (
                    <TableRow key={`${row.customerId || "walkin"}-${index}`}>
                      <TableCell className="font-medium">{row.name}</TableCell>

                      <TableCell className="capitalize">
                        {row.customerType}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {row.orders}
                      </TableCell>

                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatTaka(row.totalDue)}
                      </TableCell>

                      <TableCell>
                        <AgeBadge date={row.oldestDueDate} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DueReportPage;
