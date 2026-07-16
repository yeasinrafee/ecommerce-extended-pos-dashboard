import { Suspense } from 'react';
import PurchaseOrderForm from '@/components/Inventory/PurchaseOrderForm';

export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-500">Loading...</div>}>
      <PurchaseOrderForm />
    </Suspense>
  );
}
