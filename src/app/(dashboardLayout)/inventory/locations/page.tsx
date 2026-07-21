'use client';

import React from 'react';
import ManageLocation from '@/components/Location/ManageLocation';

export default function InventoryLocationsPage() {
  return (
    <div className='bg-white p-3 sm:p-6 rounded-none lg:rounded-2xl border border-gray-100 shadow-sm'>
      <ManageLocation />
    </div>
  );
}
