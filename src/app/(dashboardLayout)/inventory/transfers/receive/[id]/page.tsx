import { Suspense } from 'react';
import ReceiveTransferContent from './ReceiveTransferContent';
import Loader from '@/components/Common/Loader';

export default function ReceiveTransferPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center h-64'>
          <Loader />
        </div>
      }
    >
      <div className='p-0 lg:p-6'>
        <ReceiveTransferContent />
      </div>
    </Suspense>
  );
}
