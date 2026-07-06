import { Suspense } from 'react';
import EditPurchaseContent from './EditPurchaseContent';
import Loader from '@/components/Common/Loader';

export default function EditPurchasePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader /></div>}>
      <EditPurchaseContent />
    </Suspense>
  );
}
