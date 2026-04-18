"use client"

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateZonePolicy from '@/components/ZonePolicy/CreateZonePolicy'
import { useCreateZonePolicy } from '@/hooks/zone-policy.api'

export default function ClientCreateZonePolicy() {
  const router = useRouter()
  const createMutation = useCreateZonePolicy()
  const searchParams = useSearchParams()
  const initialParam = searchParams.get('initial')

  const initial = React.useMemo(() => {
    if (!initialParam) return undefined
    try {
      return JSON.parse(decodeURIComponent(initialParam))
    } catch (e) {
      console.warn('Failed to parse initial zone policy param', e)
      return undefined
    }
  }, [initialParam])

  const handleSubmit = async (values: any) => {
    await createMutation.mutateAsync(values)
    router.push('/dashboard/zone-policies/manage')
  }

  return (
    <CreateZonePolicy inline defaultValues={initial as any} onSubmit={handleSubmit} submitting={createMutation.isPending} />
  )
}
