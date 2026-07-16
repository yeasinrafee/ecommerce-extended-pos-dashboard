import { Suspense } from 'react';

import Loader from '@/components/Common/Loader';
import EditSupplierReturnContent from './EditSupplierReturnContent';

export default function EditSupplierReturnPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader /></div>}>
      <EditSupplierReturnContent />
    </Suspense>
  );
}
