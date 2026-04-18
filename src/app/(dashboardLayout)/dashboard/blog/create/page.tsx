import React, { Suspense } from "react";
import ClientCreateBlog from "./ClientCreateBlog";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 bg-background">Loading...</div>}>
      <ClientCreateBlog />
    </Suspense>
  );
}