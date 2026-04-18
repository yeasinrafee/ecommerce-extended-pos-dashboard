"use client"
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CreateProductForm from '@/components/Product/CreateProductForm'
import React from 'react'

function EditProductPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || undefined
  return <CreateProductForm productId={id} />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-500">Loading…</div>}>
      <EditProductPage />
    </Suspense>
  )
}