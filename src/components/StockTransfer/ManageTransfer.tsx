"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Table, { type Column } from "@/components/Common/Table";
import TableSkeleton from "@/components/Common/TableSkeleton";
import CustomButton from "@/components/Common/CustomButton";
import SearchBar from "@/components/FormFields/SearchBar";
import CustomSelect from "@/components/FormFields/CustomSelect";
import {
	useBulkPatchStockTransfers,
	usePaginatedStockTransfers,
	usePatchStockTransfer,
	type StockTransfer,
	type StockTransferStatus
} from "@/hooks/stock-transfer.api";

const statusOptions = [
	{ label: "Pending", value: "PENDING" },
	{ label: "In Transit", value: "IN_TRANSIT" },
	{ label: "Completed", value: "COMPLETED" },
	{ label: "Cancelled", value: "CANCELLED" }
];

const formatTransferDate = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}.${month}.${year}`;
};

const formatOrderStatus = (status: StockTransferStatus) => {
	return status
		.toLowerCase()
		.replace(/_/g, " ")
		.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
};

export default function ManageTransfer() {
	const router = useRouter();
	const [page, setPage] = React.useState(1);
	const limit = 10;

	const [searchInput, setSearchInput] = React.useState("");
	const [searchTerm, setSearchTerm] = React.useState<string | undefined>(undefined);
	const [bulkOrderStatus, setBulkOrderStatus] = React.useState("");
	const [selected, setSelected] = React.useState<Record<string, boolean>>({});
	const selectedIds = React.useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

	const bulkStatusForm = useForm<{ orderStatus: string }>({
		defaultValues: {
			orderStatus: ""
		}
	});

	React.useEffect(() => {
		const handle = window.setTimeout(() => {
			setPage(1);
			setSearchTerm(searchInput.trim() || undefined);
		}, 500);

		return () => window.clearTimeout(handle);
	}, [searchInput]);

	const { data, isLoading, error } = usePaginatedStockTransfers(page, limit, searchTerm);
	const patchMutation = usePatchStockTransfer();
	const bulkPatchMutation = useBulkPatchStockTransfers();

	const items = data?.data ?? [];

	const toggleSelect = (id: string) => {
		setSelected((current) => ({ ...current, [id]: !current[id] }));
	};

	const selectAllOnPage = () => {
		const nextSelection: Record<string, boolean> = { ...selected };
		items.forEach((item) => {
			nextSelection[item.id] = true;
		});
		setSelected(nextSelection);
	};

	const clearSelection = () => setSelected({});

	const applyBulkUpdate = () => {
		if (selectedIds.length === 0 || !bulkOrderStatus) return;

		bulkPatchMutation.mutate(
			{
				ids: selectedIds,
				orderStatus: bulkOrderStatus as StockTransferStatus
			},
			{
				onSuccess: () => {
					clearSelection();
					setBulkOrderStatus("");
					bulkStatusForm.reset({ orderStatus: "" });
				}
			}
		);
	};

	const goCreate = () => {
		router.push("/dashboard/stock-transfers/create");
	};

	const handleStatusChange = (id: string, orderStatus: StockTransferStatus) => {
		patchMutation.mutate({ id, payload: { orderStatus } });
	};

	const columns = React.useMemo<Column<StockTransfer>[]>(
		() => [
			{
				header: (
					<div className="flex items-center justify-center gap-2">
						<input
							type="checkbox"
							checked={items.length > 0 && items.every((item) => selected[item.id])}
							onChange={(event) => {
								if (event.target.checked) {
									selectAllOnPage();
								} else {
									clearSelection();
								}
							}}
						/>
						<span className="text-sm">Select</span>
					</div>
				),
				cell: (row) => (
					<input type="checkbox" checked={!!selected[row.id]} onChange={() => toggleSelect(row.id)} />
				),
				className: "w-12 text-center"
			},
			{
				header: "Invoice No",
				cell: (row) => row.invoiceNumber
			},
			{
				header: "From Branch",
				cell: (row) => row.fromStore?.name ?? "-"
			},
			{
				header: "To Branch",
				cell: (row) => row.toStore?.name ?? "-"
			},
			{
				header: "Quantity",
				cell: (row) => row.quantity,
				align: "center"
			},
			{
				header: "Status",
				cell: (row) => (
					<InlineStatusSelect
						value={row.orderStatus}
						onChange={(value) => handleStatusChange(row.id, value)}
					/>
				),
				className: "w-44"
			},
			{
				header: "Date",
				cell: (row) => formatTransferDate(row.createdAt)
			}
		],
		[items, selected]
	);

	return (
		<div>
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-lg font-medium">Manage Stock Transfers</h2>
			</div>

			<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<SearchBar
					searchInput={searchInput}
					setSearchInput={setSearchInput}
					clearSearch={() => setSearchInput("")}
				/>

				<div className="flex items-center gap-2">
					<CustomSelect
						name="orderStatus"
						control={bulkStatusForm.control}
						options={statusOptions}
						fieldToValue={(value) => value ?? ""}
						valueToField={(value) => value}
						onChangeCallback={(value) => setBulkOrderStatus(value)}
						placeholder="Bulk status"
						triggerClassName="w-44 bg-white"
					/>
					<CustomButton
						disabled={selectedIds.length === 0 || !bulkOrderStatus}
						onClick={applyBulkUpdate}
						loading={bulkPatchMutation.isPending}
					>
						Update Status
					</CustomButton>
					<CustomButton onClick={goCreate}>Add Transfer</CustomButton>
				</div>
			</div>

			{isLoading ? (
				<TableSkeleton />
			) : error ? (
				<p className="text-red-500">Failed to load stock transfers</p>
			) : (
				<Table<StockTransfer>
					columns={columns}
					data={items}
					rowKey="id"
					pageSize={limit}
					serverSide
					currentPage={page}
					totalItems={data?.meta.total ?? 0}
					onPageChange={setPage}
					showIndex={false}
				/>
			)}
		</div>
	);
}

function InlineStatusSelect({
	value,
	onChange
}: {
	value: StockTransferStatus;
	onChange: (value: StockTransferStatus) => void;
}) {
	const { control, reset } = useForm<{ status: StockTransferStatus }>({
		defaultValues: {
			status: value
		}
	});

	const timerRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		reset({ status: value });
	}, [value, reset]);

	React.useEffect(() => {
		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
			}
		};
	}, []);

	const handleChange = (nextValue: string) => {
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
		}

		timerRef.current = window.setTimeout(() => {
			onChange(nextValue as StockTransferStatus);
			timerRef.current = null;
		}, 500);
	};

	return (
		<CustomSelect
			name="status"
			control={control}
			options={statusOptions.map((option) => ({
				...option,
				label: formatOrderStatus(option.value as StockTransferStatus)
			}))}
			fieldToValue={(nextValue: StockTransferStatus) => nextValue}
			valueToField={(nextValue: string) => nextValue}
			onChangeCallback={handleChange}
			placeholder="Select status"
			triggerClassName="w-40 bg-white"
		/>
	);
}