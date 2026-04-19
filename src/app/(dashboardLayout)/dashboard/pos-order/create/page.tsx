import CreatePosOrder from "@/components/PosOrder/CreatePosOrder";
import { Suspense } from "react";

export default function CreatePosOrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatePosOrder />
    </Suspense>
  );
}
