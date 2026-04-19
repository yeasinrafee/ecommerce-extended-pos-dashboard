"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import CustomButton from "@/components/Common/CustomButton";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomSelect from "@/components/FormFields/CustomSelect";
import DateTimeInput from "@/components/FormFields/CustomDateInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { useAllStores } from "@/hooks/store.api";
import {
	useCreateStockTransfer,
	useGenerateStockTransferInvoiceNumber,
	useStockTransferProductSearch,
	type StockTransferProductSearchResult,
	type StockTransferPayload
} from "@/hooks/stock-transfer.api";

const schema = z.object({
	fromStoreId: z.string().min(1, "Source store is required"),
	toStoreId: z.string().min(1, "Destination store is required"),
	invoiceNumber: z.string().regex(/^\d{12}$/, "Invoice number must be 12 digits"),
	createDate: z
		.string()
		.min(1, "Create date is required")
		.refine((value) => !Number.isNaN(new Date(value).getTime()), "Create date is invalid"),
	products: z
		.array(
			z.object({
				productId: z.string().min(1, "Product is required"),
				quantity: z.coerce.number().int().min(1, "Quantity must be at least 1")
			})
		)
		.min(1, "At least one product is required")
});

type FormSchema = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

type ProductMap = Record<string, StockTransferProductSearchResult & { image?: string }>;

const toDateTimeLocal = (date: Date) => {
	const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
	return copy.toISOString().slice(0, 16);
};

const formatMoney = (value: number) => {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0
	}).format(value);
};

export default function CreateTransfer() {
	const router = useRouter();
	const { data: stores, isLoading: storesLoading } = useAllStores();
	const { data: generatedInvoice, isFetching: generatingInvoice } = useGenerateStockTransferInvoiceNumber(true);
	const createMutation = useCreateStockTransfer();

	const {
		register,
		control,
		handleSubmit,
		setValue,
		getValues,
		setError,
		clearErrors,
		formState: { errors, isSubmitting }
	} = useForm<FormValues, unknown, FormSchema>({
		resolver: zodResolver(schema),
		defaultValues: {
			fromStoreId: "",
			toStoreId: "",
			invoiceNumber: "",
			createDate: toDateTimeLocal(new Date()),
			products: []
		}
	});

	const { fields, append, remove, replace } = useFieldArray({
		control,
		name: "products"
	});

	const watchedProducts = useWatch({
		control,
		name: "products"
	});
	const watchedInvoiceNumber = useWatch({
		control,
		name: "invoiceNumber"
	});
	const fromStoreId = useWatch({
		control,
		name: "fromStoreId"
	});

	const [nameSearchInput, setNameSearchInput] = React.useState("");
	const [nameSearchTerm, setNameSearchTerm] = React.useState("");
	const [productMap, setProductMap] = React.useState<ProductMap>({});

	React.useEffect(() => {
		const handle = window.setTimeout(() => {
			setNameSearchTerm(nameSearchInput.trim());
		}, 350);
		return () => window.clearTimeout(handle);
	}, [nameSearchInput]);

	React.useEffect(() => {
		if (generatedInvoice && !getValues("invoiceNumber")) {
			setValue("invoiceNumber", generatedInvoice, { shouldValidate: true });
		}
	}, [generatedInvoice, getValues, setValue]);

	React.useEffect(() => {
		replace([]);
		setProductMap({});
		setNameSearchInput("");
		setNameSearchTerm("");
		if (getValues("toStoreId") === fromStoreId) {
			setValue("toStoreId", "");
		}
	}, [fromStoreId, getValues, replace, setValue]);

	const { data: searchProducts, isFetching: searchingProducts } = useStockTransferProductSearch(fromStoreId, nameSearchTerm);

	const destinationStores = React.useMemo(() => {
		return (stores ?? []).filter((item) => item.id !== fromStoreId);
	}, [stores, fromStoreId]);

	const selectedProductIds = React.useMemo(() => {
		return new Set((watchedProducts ?? []).map((item) => item?.productId).filter(Boolean));
	}, [watchedProducts]);

	const availableSearchProducts = React.useMemo(() => {
		if (!searchProducts) return [];
		return searchProducts.filter((item) => !selectedProductIds.has(item.id));
	}, [searchProducts, selectedProductIds]);

	const totals = React.useMemo(() => {
		const productRows = watchedProducts ?? [];
		const totalQty = productRows.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0);
		const grandTotal = productRows.reduce((sum, item) => {
			const quantity = Number(item?.quantity ?? 0);
			const purchasePrice = Number(productMap[item?.productId ?? ""]?.purchasePrice ?? 0);
			return sum + quantity * purchasePrice;
		}, 0);

		return {
			totalQty,
			grandTotal: Number(grandTotal.toFixed(2))
		};
	}, [productMap, watchedProducts]);

	const addProduct = (product: StockTransferProductSearchResult) => {
		append({
			productId: product.id,
			quantity: 1
		});

		setProductMap((prev) => ({ ...prev, [product.id]: product }));
	};

	const submit = async (values: FormSchema) => {
		clearErrors();

		if (values.fromStoreId === values.toStoreId) {
			setError("toStoreId", { type: "manual", message: "Source and destination stores must be different" });
			return;
		}

		for (let index = 0; index < values.products.length; index += 1) {
			const row = values.products[index];
			const product = productMap[row.productId];

			if (!product) {
				setError(`products.${index}.productId` as const, {
					type: "manual",
					message: "Product is not available in this store"
				});
				return;
			}

			if (Number(row.quantity) > product.availableQuantity) {
				setError(`products.${index}.quantity` as const, {
					type: "manual",
					message: `Available quantity is ${product.availableQuantity}`
				});
				return;
			}
		}

		const payload: StockTransferPayload = {
			fromStoreId: values.fromStoreId,
			toStoreId: values.toStoreId,
			invoiceNumber: values.invoiceNumber,
			createdAt: new Date(values.createDate).toISOString(),
			products: values.products.map((item) => ({
				productId: item.productId,
				quantity: Number(item.quantity)
			}))
		};

		await createMutation.mutateAsync(payload);
		router.push("/dashboard/stock-transfers/manage");
	};

	const loading = isSubmitting || createMutation.isPending || storesLoading;

	return (
		<div className="mx-auto w-full max-w-325 p-4">
			<div className="mb-4 flex items-center justify-between gap-3">
				<h2 className="text-lg font-medium">Create Stock Transfer</h2>
				<div className="flex items-center gap-2">
					<CustomButton variant="outline" onClick={() => router.push("/dashboard/stock-transfers/manage")}>Back</CustomButton>
					<CustomButton loading={loading} type="button" onClick={handleSubmit(submit)}>
						Submit
					</CustomButton>
				</div>
			</div>

			<form onSubmit={handleSubmit(submit)} className="space-y-5">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<CustomSelect
						name="fromStoreId"
						control={control}
						label="From Store/Branch"
						requiredMark
						placeholder="Select Source Store/Branch"
						options={(stores ?? []).map((item) => ({ label: item.name, value: item.id }))}
						fieldToValue={(value: string) => value ?? ""}
						valueToField={(value: string) => value}
					/>

					<CustomSelect
						name="toStoreId"
						control={control}
						label="To Store/Branch"
						requiredMark
						placeholder="Select Destination Store/Branch"
						options={destinationStores.map((item) => ({ label: item.name, value: item.id }))}
						fieldToValue={(value: string) => value ?? ""}
						valueToField={(value: string) => value}
						disabled={!fromStoreId}
					/>

					<CustomInput
						label="Invoice No"
						requiredMark
						readOnly
						value={watchedInvoiceNumber ?? ""}
						error={errors.invoiceNumber?.message}
						helperText={generatingInvoice ? "Generating invoice number..." : undefined}
					/>

					<div className="space-y-2">
						<label className="text-sm font-medium">
							Create Date
							<span className="ml-1 text-destructive" aria-hidden="true">*</span>
						</label>
						<Controller
							name="createDate"
							control={control}
							render={({ field }) => (
								<DateTimeInput value={field.value ?? ""} onChange={field.onChange} inputClassName="h-10" />
							)}
						/>
						{errors.createDate?.message ? <p className="text-xs text-destructive">{errors.createDate.message}</p> : null}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
						<Input
							value={nameSearchInput}
							onChange={(event) => setNameSearchInput(event.target.value)}
							placeholder={fromStoreId ? "Search Product Name, SKU, ID" : "Select source store first"}
							className="h-10 pl-10"
							disabled={!fromStoreId}
						/>
					</div>
				</div>

				{fromStoreId && nameSearchTerm ? (
					<div className="rounded-md border bg-white">
						<div className="max-h-52 overflow-y-auto">
							{searchingProducts ? (
								<p className="px-3 py-2 text-sm text-muted-foreground">Searching products...</p>
							) : availableSearchProducts.length > 0 ? (
								availableSearchProducts.map((product) => (
									<button
										key={product.id}
										type="button"
										onClick={() => addProduct(product)}
										className="flex w-full items-center gap-3 border-b px-3 py-2 text-left transition hover:bg-slate-50 last:border-b-0"
									>
										<div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-slate-100">
											{product.image ? (
												<Image src={product.image} alt={product.name} width={48} height={48} className="h-12 w-12 object-cover" />
											) : null}
										</div>
										<div>
											<p className="text-sm font-medium">{product.name}</p>
											<p className="text-xs text-muted-foreground">
												{product.sku ? `SKU: ${product.sku}` : "No SKU"} | Available: {product.availableQuantity}
											</p>
										</div>
										<div className="ml-auto">
											<Plus className="h-4 w-4 text-emerald-600" />
										</div>
									</button>
								))
							) : (
								<p className="px-3 py-2 text-sm text-muted-foreground">No products found</p>
							)}
						</div>
					</div>
				) : null}

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-14">SL</TableHead>
								<TableHead className="w-16 text-center">Image</TableHead>
								<TableHead>Product Name</TableHead>
								<TableHead className="text-center">Available</TableHead>
								<TableHead className="w-36 text-center">Quantity</TableHead>
								<TableHead className="w-44 text-center">Purchase Price</TableHead>
								<TableHead className="w-40 text-center">Total Price</TableHead>
								<TableHead className="w-20 text-center" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{fields.map((field, index) => {
								const item = watchedProducts?.[index];
								const product = productMap[field.productId];
								const quantity = Number(item?.quantity ?? 0);
								const purchasePrice = Number(product?.purchasePrice ?? 0);
								const totalPrice = Number((quantity * purchasePrice).toFixed(2));

								return (
									<TableRow key={field.id}>
										<TableCell>{index + 1}</TableCell>
										<TableCell className="text-center">
											<div className="mx-auto h-12 w-12 overflow-hidden rounded-md border bg-slate-100">
												{product?.image ? (
													<Image src={product.image} alt={product.name ?? "Product image"} width={48} height={48} className="h-12 w-12 object-cover" />
												) : null}
											</div>
										</TableCell>
										<TableCell>
											<div className="font-medium">{product?.name ?? "Unknown Product"}</div>
											<div className="text-xs text-muted-foreground">{product?.sku ? `SKU: ${product.sku}` : "No SKU"}</div>
											<input type="hidden" {...register(`products.${index}.productId`)} value={field.productId} />
										</TableCell>
										<TableCell className="text-center">{product?.availableQuantity ?? "-"}</TableCell>
										<TableCell>
											<Input
												type="number"
												min={1}
												className="h-9 text-center"
												{...register(`products.${index}.quantity`, { valueAsNumber: true })}
											/>
											{errors.products?.[index]?.quantity?.message ? (
												<p className="mt-1 text-xs text-destructive">{errors.products[index]?.quantity?.message}</p>
											) : null}
										</TableCell>
										<TableCell className="text-center font-medium">{formatMoney(purchasePrice)}</TableCell>
										<TableCell className="text-center font-medium">{formatMoney(totalPrice)}</TableCell>
										<TableCell className="text-center">
											<Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
												<Trash2 className="h-4 w-4 text-rose-500" />
											</Button>
										</TableCell>
									</TableRow>
								);
							})}

							<TableRow>
								<TableCell colSpan={3} />
								<TableCell className="text-center font-semibold">Total QTY: {totals.totalQty}</TableCell>
								<TableCell className="text-center font-semibold">Grand Total</TableCell>
								<TableCell className="text-center font-semibold">{formatMoney(totals.grandTotal)}</TableCell>
								<TableCell />
							</TableRow>
						</TableBody>
					</Table>
				</div>

				{errors.products?.message ? <p className="text-sm text-destructive">{errors.products.message}</p> : null}
			</form>
		</div>
	);
}