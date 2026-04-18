import React from 'react';
import EditOffer from '@/components/Offer/EditOffer';

export default async function Page({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="p-4">
      <EditOffer offerId={id} />
    </div>
  );
}