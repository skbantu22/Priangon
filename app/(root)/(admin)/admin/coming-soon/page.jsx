"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { IoConstructOutline, IoCartOutline } from "react-icons/io5";

function ComingSoon() {
  const moduleName = useSearchParams().get("m") || "This module";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <IoConstructOutline className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold">{moduleName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is being built and will be available soon.
        </p>
        <Link
          href="/admin/pos"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:brightness-110"
        >
          <IoCartOutline className="size-4" />
          Go to POS
        </Link>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense>
      <ComingSoon />
    </Suspense>
  );
}
