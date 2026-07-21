import { Suspense } from 'react';
import EditTransferContent from './EditTransferContent';
import Loader from '@/components/Common/Loader';

export default function EditTransferPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center h-64'>
          <Loader />
        </div>
      }
    >
      <div className='p-0 lg:p-6'>
        <EditTransferContent />
      </div>
    </Suspense>
  );
}
