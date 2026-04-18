"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import DeleteModal from "@/components/Common/DeleteModal";
import CustomButton from "@/components/Common/CustomButton";
import CustomCheckbox from "@/components/FormFields/CustomCheckbox";
import CustomSelect from "@/components/FormFields/CustomSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useDeleteOffer, usePaginatedOffers, useBulkUpdateOfferStatus, type Offer } from "@/hooks/offer.api";

const formatDate = (value: string | null) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
};

const formatMoney = (value: number | null | undefined) => {
	if (value == null) return "-";
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
};

const statusOptions = [
	{ label: "Active", value: "ACTIVE" },
	{ label: "Inactive", value: "INACTIVE" }
];

type StatusFormValues = {
	status: "ACTIVE" | "INACTIVE" | "";
};

const ManageOffer = () => {
	const router = useRouter();
	const [page, setPage] = React.useState(1);
	const limit = 10;
	const { data, isLoading, error } = usePaginatedOffers(page, limit);
	const deleteMutation = useDeleteOffer();
	const bulkUpdateMutation = useBulkUpdateOfferStatus();
	const { control, watch, reset: resetStatusForm } = useForm<StatusFormValues>({
		defaultValues: {
			status: ""
		}
	});

	const [deleteTarget, setDeleteTarget] = React.useState<Offer | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
	const [selectedOfferIds, setSelectedOfferIds] = React.useState<string[]>([]);

	const items = data?.data ?? [];
	const selectedStatus = watch("status");
	const selectedIdSet = React.useMemo(() => new Set(selectedOfferIds), [selectedOfferIds]);
	const visibleItemIds = React.useMemo(() => items.map((item) => item.id), [items]);
	const visibleSelectedCount = React.useMemo(() => items.filter((item) => selectedIdSet.has(item.id)).length, [items, selectedIdSet]);
	const allVisibleSelected = items.length > 0 && visibleSelectedCount === items.length;
	const someVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < items.length;

	const columns = React.useMemo<Column<Offer>[]>(() => [
		{
			header: (
				<CustomCheckbox
					checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
					onCheckedChange={(checked) => {
						setSelectedOfferIds((current) => {
							const currentSet = new Set(current);
							if (checked) {
								return Array.from(new Set([...current, ...visibleItemIds]));
							}
							visibleItemIds.forEach((id) => currentSet.delete(id));
							return Array.from(currentSet);
						});
					}}
					aria-label="Select all offers on this page"
				/>
			),
			cell: (row) => (
				<CustomCheckbox
					checked={selectedIdSet.has(row.id)}
					onCheckedChange={(checked) => {
						setSelectedOfferIds((current) => {
							if (checked) {
								return current.includes(row.id) ? current : [...current, row.id];
							}
							return current.filter((id) => id !== row.id);
						});
					}}
					aria-label={`Select offer ${row.id}`}
				/>
			),
			align: "center",
			width: 56
		},
		{
			header: "Discount Type",
			cell: (row) => row.discountType ? row.discountType.replace(/_/g, " ") : "NONE"
		},
		{
			header: "Discount Value",
			cell: (row) => formatMoney(row.discountValue)
		},
		{
			header: "Products",
			cell: (row) => {
				const names = row.offerProducts?.map((item) => item.product?.name).filter(Boolean) as string[] | undefined;
				return names && names.length > 0 ? names.join(" - ") : "-";
			},
			align: "left"
		},
		{
			header: "Start Date",
			cell: (row) => formatDate(row.discountStartDate)
		},
		{
			header: "End Date",
			cell: (row) => formatDate(row.discountEndDate)
		},
		{
			header: "Created",
			cell: (row) => formatDate(row.createdAt)
		},
		{
			header: "Status",
			cell: (row) => <Badge variant={row.status === "ACTIVE" ? "default" : "outline"}>{row.status}</Badge>
		}
	], [allVisibleSelected, someVisibleSelected, selectedIdSet, visibleItemIds]);

	const handleBulkStatusUpdate = async () => {
		if (!selectedStatus || selectedOfferIds.length === 0) return;

		try {
			await bulkUpdateMutation.mutateAsync({ ids: selectedOfferIds, status: selectedStatus });
			setSelectedOfferIds([]);
			resetStatusForm({ status: "" });
		} catch {
			return;
		}
	};

	const isUpdating = bulkUpdateMutation.isPending;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-slate-900">Manage Offers</h1>
					<p className="mt-1 text-sm text-slate-500">Create, edit, and remove product offers.</p>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<CustomSelect
						name="status"
						control={control}
						label="Status"
						placeholder="Select status"
						options={statusOptions}
						triggerClassName="bg-white"
						fieldClassName="min-w-[180px]"
					/>
					<CustomButton onClick={handleBulkStatusUpdate} disabled={!selectedStatus || selectedOfferIds.length === 0} loading={isUpdating}>
						Update Status
					</CustomButton>
					<CustomButton onClick={() => router.push("/dashboard/offers/create")}>Create Offer</CustomButton>
				</div>
			</div>

			{/* {selectedOfferIds.length > 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
					{selectedOfferIds.length} offer(s) selected for status update.
				</div>
			) : null} */}

			<div className="rounded-2xl border bg-white p-6 shadow-sm">
				{isLoading ? (
					<TableSkeleton columns={8} />
				) : error ? (
					<p className="text-sm text-red-500">Failed to load offers</p>
				) : (
					<Table<Offer>
						columns={columns}
						data={items}
						rowKey="id"
						pageSize={limit}
						serverSide
						currentPage={page}
						totalItems={data?.meta.total ?? 0}
						onPageChange={setPage}
						renderRowActions={(offer) => (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon"><MoreHorizontal /></Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem onClick={() => router.push(`/dashboard/offers/edit/${offer.id}`)}>Edit</DropdownMenuItem>
									<DropdownMenuItem variant="destructive" onClick={() => { setDeleteTarget(offer); setDeleteModalOpen(true); }}>Delete</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					/>
				)}
			</div>

			<DeleteModal
				open={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				title="Delete Offer"
				description={deleteTarget ? `Are you sure you want to delete this offer? This will only soft delete the record.` : undefined}
				onConfirm={() => {
					if (!deleteTarget) return;
					deleteMutation.mutate(deleteTarget.id, {
						onSuccess: () => {
							setDeleteModalOpen(false);
							setDeleteTarget(null);
							setSelectedOfferIds((current) => current.filter((id) => id !== deleteTarget.id));
						}
					});
				}}
				loading={deleteMutation.isPending}
			/>
		</div>
	);
};

export default ManageOffer;