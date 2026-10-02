"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_SUPPLIER_SHOW } from "@/Route/Adminpannelroute";

import SupplierFields, {
  emptySupplierForm,
  supplierFormError,
  supplierToForm,
} from "@/components/ui/Application/Admin/supplier/SupplierFields";
import { ListCard, btn } from "@/components/ui/Application/Admin/listKit";
import { Skeleton } from "@/components/ui/skeleton";

/** Edit one supplier on its own page, reached from Action → Edit on the list */
export default function SupplierEditPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState(emptySupplierForm);
  const [areas, setAreas] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    axios
      .get(`/api/supplier/${id}`)
      .then(({ data }) => {
        if (cancelled) return;

        if (!data.success) {
          setMissing(true);
          showToast("error", data.message || "Supplier not found");
          return;
        }

        setForm(supplierToForm(data.data));
      })
      .catch((error) => {
        if (cancelled) return;

        setMissing(true);
        showToast("error", error.response?.data?.message || "Could not load the supplier");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Branches name the supplier's shop; areas are the shop's own areas
  useEffect(() => {
    let cancelled = false;

    axios
      .get("/api/showrooms")
      .then(({ data }) => {
        if (!cancelled && data.success) setBranches(data.showrooms || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    let cancelled = false;

    axios
      .get("/api/areas", { params: { branch: form.showroomId || "warehouse" } })
      .then(({ data }) => {
        if (!cancelled && data.success) setAreas(data.data || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [loading, form.showroomId]);

  const save = async (event) => {
    event.preventDefault();

    const error = supplierFormError(form);

    if (error) {
      showToast("error", error);
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.put(`/api/supplier/update/${id}`, form);

      if (!data.success) {
        showToast("error", data.message || "Could not save supplier");
        return;
      }

      showToast("success", "Supplier updated");
      router.push(ADMIN_SUPPLIER_SHOW);
      router.refresh();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save supplier");
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <button type="button" onClick={() => router.push(ADMIN_SUPPLIER_SHOW)} className={btn.secondary}>
      <ArrowLeft size={15} />
      Back to suppliers
    </button>
  );

  if (loading) {
    return (
      <ListCard title="Update Supplier" actions={back}>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </ListCard>
    );
  }

  if (missing) {
    return (
      <ListCard title="Update Supplier" actions={back}>
        <p className="py-6 text-center text-sm text-muted-foreground">This supplier is no longer available.</p>
      </ListCard>
    );
  }

  return (
    <ListCard title={`Update Supplier — ${form.name}`} actions={back}>
      <form onSubmit={save} noValidate>
        <SupplierFields form={form} setForm={setForm} areas={areas} branches={branches} />

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(ADMIN_SUPPLIER_SHOW)}
            className={btn.secondary}
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btn.success}>
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </form>
    </ListCard>
  );
}
