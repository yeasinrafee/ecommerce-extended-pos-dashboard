"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { useRouter } from 'next/navigation'
import Table, { type Column } from "@/components/Common/Table"
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton"
import CreateZonePolicy from "./CreateZonePolicy"
import DeleteModal from "@/components/Common/DeleteModal"
import SearchBar from "@/components/FormFields/SearchBar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import * as api from "@/hooks/zone-policy.api"
import type { ZonePolicy } from "@/hooks/zone-policy.api"
import CustomSelect from "@/components/FormFields/CustomSelect"

// Format names like "MATTHEW_BANKS" -> "Matthew Banks"
const formatUpperUnderscore = (input?: string) => {
  if (!input) return ""
  const s = input.replace(/_+/g, " ").toLowerCase()
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function ManageZonePolicy() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ZonePolicy | null>(null)
  const [page, setPage] = React.useState(1)
  const limit = 10

  const [searchInput, setSearchInput] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1)
      setSearchTerm(searchInput.trim() || undefined)
    }, 500)
    return () => clearTimeout(handle)
  }, [searchInput])

  const policiesQuery = api.usePaginatedZonePolicies(page, limit, searchTerm)
  const { data, isLoading, error } = policiesQuery
  const createMutation = api.useCreateZonePolicy()
  const updateMutation = api.useUpdateZonePolicy()
  const deleteMutation = api.useDeleteZonePolicy()
  const bulkUpdateMutation = api.useBulkUpdateZonePolicies()
  const router = useRouter()

  const handleInlineStatusChange = (id: string, status: "ACTIVE" | "INACTIVE") => {
    updateMutation.mutate({ id, payload: { status } })
  }

  const handleCreate = () => {
    // navigate to dedicated create page
    setEditing(null)
    router.push('/dashboard/zone-policies/create')
  }

  const handleEdit = (policy: ZonePolicy) => {
    const initial = {
      policyName: policy.policyName,
      deliveryTime: policy.deliveryTime,
      shippingCost: policy.shippingCost,
      status: policy.status,
      zoneIds: policy.zones ? policy.zones.map((r) => r.zone.id) : []
    }
    const encoded = encodeURIComponent(JSON.stringify(initial))
    router.push(`/dashboard/zone-policies/create?initial=${encoded}`)
  }

  const [deleteTarget, setDeleteTarget] = React.useState<ZonePolicy | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])

  const toggleSelect = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }

  const selectAllOnPage = () => {
    const newSel: Record<string, boolean> = { ...selected };
    (data?.data ?? []).forEach((it) => {
      newSel[it.id] = true
    })
    setSelected(newSel)
  }

  const clearSelection = () => setSelected({})

  const [bulkStatus, setBulkStatus] = React.useState<"ACTIVE" | "INACTIVE">("ACTIVE")
  const bulkForm = useForm<{ status: "ACTIVE" | "INACTIVE" }>({ defaultValues: { status: bulkStatus } })

  React.useEffect(() => {
    bulkForm.reset({ status: bulkStatus })
  }, [bulkStatus])

  const applyBulkStatus = () => {
    if (selectedIds.length === 0) return
    bulkUpdateMutation.mutate({ ids: selectedIds, status: bulkStatus }, {
      onSuccess: () => clearSelection()
    })
  }

  const handleDelete = (policy: ZonePolicy) => {
    setDeleteTarget(policy)
    setDeleteModalOpen(true)
  }

  const handleSavePolicy = async (payload: { policyName: string; deliveryTime: number; shippingCost: number; status?: "ACTIVE" | "INACTIVE"; zoneIds?: string[] }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload })
    } else {
      await createMutation.mutateAsync(payload)
    }

    setModalOpen(false)
  }

  const columns = React.useMemo<Column<ZonePolicy>[]>(
    () => [
      {
        header: (
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              checked={(data?.data ?? []).length > 0 && (data?.data ?? []).every((it) => selected[it.id])}
              onChange={(e) => {
                if (e.target.checked) selectAllOnPage()
                else clearSelection()
              }}
            />
            <span className="text-sm">Select</span>
          </div>
        ),
        cell: (row) => (
          <input
            type="checkbox"
            checked={!!selected[row.id]}
            onChange={() => toggleSelect(row.id)}
          />
        ),
        className: "w-12 text-center"
      },
      { header: "Policy Name", accessor: "policyName" },
      {
        header: "Zones",
        accessor: "zones",
        cell: (row) => (
          row.zones && row.zones.length > 0
            ? row.zones.map((z) => formatUpperUnderscore(z.zone?.name)).filter(Boolean).join(' - ')
            : "-"
        )
      },
      { header: "Delivery Time", accessor: "deliveryTime", cell: (row) => row.deliveryTime },
      { header: "Shipping Cost", accessor: "shippingCost", cell: (row) => row.shippingCost },
      {
        header: "Status",
        accessor: "status",
        cell: (row) => (
          <InlineStatusSelect value={row.status ?? "INACTIVE"} onChange={(s) => handleInlineStatusChange(row.id, s as "ACTIVE" | "INACTIVE")} />
        )
      },
      { header: "Created", accessor: "createdAt", cell: (row) => new Date(row.createdAt).toLocaleString() }
    ],
    [data, selected]
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Manage Zone Policies</h2>

      <div className="flex items-center justify-between mb-4">
        <SearchBar searchInput={searchInput} setSearchInput={setSearchInput} clearSearch={() => setSearchInput("")} />
        <div className="flex items-center gap-2">
          <CustomSelect
            name="status"
            control={bulkForm.control}
            options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
            valueToField={(v) => v}
            fieldToValue={(v) => v}
            onChangeCallback={(v: string) => setBulkStatus(v as "ACTIVE" | "INACTIVE")}
            placeholder="Bulk status"
            triggerClassName="w-40 min-h-10 bg-background"
          />
          <CustomButton disabled={selectedIds.length === 0} onClick={applyBulkStatus} loading={bulkUpdateMutation.isPending}>Update Status</CustomButton>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <p className="text-red-500">Failed to load zone policies</p>
      ) : (
        <Table<ZonePolicy>
          columns={columns}
          data={data?.data ?? []}
          rowKey="id"
          pageSize={limit}
          serverSide
          currentPage={page}
          totalItems={data?.meta.total ?? 0}
          onPageChange={setPage}
          renderRowActions={(policy) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(policy)}>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(policy)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <CreateZonePolicy
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultValues={editing ? { policyName: editing.policyName, deliveryTime: editing.deliveryTime, shippingCost: editing.shippingCost, status: editing.status, zoneIds: editing.zones ? editing.zones.map((r) => r.zone.id) : [] } : undefined}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSavePolicy}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Confirm deletion"
        description={deleteTarget ? `Are you sure you want to delete policy "${deleteTarget.policyName}"? This action cannot be undone.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteModalOpen(false) })
          }
        }}
      />
    </div>
  )
}

function InlineStatusSelect({ value, onChange }: { value: "ACTIVE" | "INACTIVE"; onChange: (v: "ACTIVE" | "INACTIVE") => void }) {
  const { control, reset } = useForm<{ status: "ACTIVE" | "INACTIVE" }>({ defaultValues: { status: value } })
  const [val, setVal] = React.useState<"ACTIVE" | "INACTIVE">(value)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    reset({ status: value })
    setVal(value)
  }, [value, reset])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (v: string) => {
    const val = v as "ACTIVE" | "INACTIVE"
    setVal(val)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      onChange(val)
      timerRef.current = null
    }, 500)
  }

  return (
    <CustomSelect
      name={"status"}
      control={control}
      options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]}
      fieldToValue={(v: any) => v ?? ""}
      valueToField={(v: string) => v}
      onChangeCallback={handleChange}
      placeholder="Status"
      triggerClassName="w-32"
    />
  )
}
