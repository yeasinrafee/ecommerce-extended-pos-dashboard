"use client"
import { Suspense } from 'react'
import CreateProductForm from '@/components/Product/CreateProductForm'

function CreateProductPage() {
  return <CreateProductForm />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-500">Loading…</div>}>
      <CreateProductPage />
    </Suspense>
  )
}
