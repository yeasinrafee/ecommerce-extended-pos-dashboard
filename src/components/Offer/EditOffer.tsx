"use client";

import OfferForm from "./OfferForm";

type Props = {
  offerId: string;
};

const EditOffer = ({ offerId }: Props) => {
  return <OfferForm offerId={offerId} title="Edit Offer" description="Update the offer settings and the products included in this discount." />;
};

export default EditOffer;