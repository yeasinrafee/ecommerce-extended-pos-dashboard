import React from "react"
import ViewOrder from "@/components/Order/ViewOrder"

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return (
    <div className="flex-1 w-full bg-slate-50/30">
      <ViewOrder orderId={id} />
    </div>
  );
}
