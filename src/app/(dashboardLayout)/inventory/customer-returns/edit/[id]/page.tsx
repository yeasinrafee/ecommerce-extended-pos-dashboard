import { Suspense } from 'react';

import Loader from '@/components/Common/Loader';
import EditCustomerReturnContent from './EditCustomerReturnContent';

export default function EditCustomerReturnPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader /></div>}>
      <EditCustomerReturnContent />
    </Suspense>
  );
}
