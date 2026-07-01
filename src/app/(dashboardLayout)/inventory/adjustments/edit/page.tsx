import { Suspense } from 'react';
import EditAdjustmentContent from './EditAdjustmentContent';
import Loader from '@/components/Common/Loader';

export default function EditAdjustmentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader /></div>}>
      <EditAdjustmentContent />
    </Suspense>
  );
}
