"use client";

import React from "react";
import { Suspense } from "react";
import CreateStock from "@/components/Stock/CreateStock";

function CreateStockPage() {
  return <CreateStock />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-slate-500">Loading...</div>}>
      <CreateStockPage />
    </Suspense>
  );
}
