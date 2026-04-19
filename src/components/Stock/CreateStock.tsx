"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Trash2 } from "lucide-react";
import CustomButton from "@/components/Common/CustomButton";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomSelect from "@/components/FormFields/CustomSelect";
import CustomTextArea from "@/components/FormFields/CustomTextArea";
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
import { useAllSuppliers } from "@/hooks/supplier.api";
import { useAllStores } from "@/hooks/store.api";
import {
  useCreateStock,
  useGenerateStockInvoiceNumber,
  usePatchStock,
  useStock,
  useStockProductSearch,
  type ProductSearchResult,
  type StockOrderStatus,
  type StockPayload
} from "@/hooks/stock.api";

const orderStatusOptions: Array<{ label: string; value: StockOrderStatus }> = [
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" }
];

const optionalNoteSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return value;
}, z.string().optional());

const schema = z.object({
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  storeId: z.string().min(1, "Store/Branch is required"),
  invoiceNumber: z.string().regex(/^\d{12}$/, "Invoice number must be 12 digits"),
  createDate: z
    .string()
    .min(1, "Create date is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Create date is invalid"),
  note: optionalNoteSchema,
  orderStatus: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  products: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative")
      })
    )
    .min(1, "At least one product is required")
});

type FormSchema = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

type ProductMap = Record<string, ProductSearchResult>;

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

export default function CreateStock() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stockId = searchParams.get("id") ?? "";
  const isEdit = Boolean(stockId);

  const { data: suppliers, isLoading: suppliersLoading } = useAllSuppliers();
  const { data: stores, isLoading: storesLoading } = useAllStores();
  const { data: existingStock, isLoading: stockLoading } = useStock(stockId);
  const { data: generatedInvoice, isFetching: generatingInvoice } = useGenerateStockInvoiceNumber(!isEdit);

  const createMutation = useCreateStock();
  const updateMutation = usePatchStock();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<FormValues, unknown, FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: 0,
      storeId: "",
      invoiceNumber: "",
      createDate: toDateTimeLocal(new Date()),
      note: "",
      orderStatus: "PENDING",
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

  const [nameSearchInput, setNameSearchInput] = React.useState("");
  const [nameSearchTerm, setNameSearchTerm] = React.useState("");
  const [productMap, setProductMap] = React.useState<ProductMap>({});

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setNameSearchTerm(nameSearchInput.trim());
    }, 350);
    return () => window.clearTimeout(handle);
  }, [nameSearchInput]);

  const combinedSearchTerm = nameSearchTerm;

  const { data: searchProducts, isFetching: searchingProducts } = useStockProductSearch(combinedSearchTerm);

  React.useEffect(() => {
    if (!generatedInvoice || isEdit) return;

    const currentInvoice = getValues("invoiceNumber");
    if (!currentInvoice) {
      setValue("invoiceNumber", generatedInvoice, { shouldValidate: true });
    }
  }, [generatedInvoice, isEdit, getValues, setValue]);

  React.useEffect(() => {
    if (!existingStock || !isEdit) return;

    const mappedProducts = (existingStock.stockProducts ?? []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice
    }));

    const nextProductMap: ProductMap = {};
    (existingStock.stockProducts ?? []).forEach((item) => {
      if (!item.product) return;
      nextProductMap[item.product.id] = {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        stock: item.product.stock
      };
    });

    setProductMap((prev) => ({ ...prev, ...nextProductMap }));

    reset({
      supplierId: existingStock.supplierId,
      storeId: existingStock.storeId,
      invoiceNumber: existingStock.invoiceNumber,
      createDate: toDateTimeLocal(new Date(existingStock.createdAt)),
      note: existingStock.note ?? "",
      orderStatus: existingStock.orderStatus,
      products: mappedProducts
    });

    replace(mappedProducts);
  }, [existingStock, isEdit, replace, reset]);

  React.useEffect(() => {
    if (!searchProducts || searchProducts.length === 0) return;

    setProductMap((prev) => {
      const next = { ...prev };
      searchProducts.forEach((item) => {
        next[item.id] = item;
      });
      return next;
    });
  }, [searchProducts]);

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
      const purchasePrice = Number(item?.purchasePrice ?? 0);
      return sum + quantity * purchasePrice;
    }, 0);

    return {
      totalQty,
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }, [watchedProducts]);

  const addProduct = (product: ProductSearchResult) => {
    append({
      productId: product.id,
      quantity: 1,
      purchasePrice: 0
    });

    setProductMap((prev) => ({ ...prev, [product.id]: product }));
  };

  const submit = async (values: FormSchema) => {
    const payload: StockPayload = {
      supplierId: values.supplierId,
      storeId: values.storeId,
      invoiceNumber: values.invoiceNumber,
      note: values.note,
      orderStatus: values.orderStatus,
      createdAt: new Date(values.createDate).toISOString(),
      products: values.products.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice)
      }))
    };

    if (isEdit && stockId) {
      await updateMutation.mutateAsync({ id: stockId, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    router.push("/dashboard/stocks/manage");
  };

  const loading =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending ||
    suppliersLoading ||
    storesLoading ||
    stockLoading;

  return (
    <div className="mx-auto w-full max-w-325 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-medium">{isEdit ? "Update Stock" : "Create Stock"}</h2>
        <div className="flex items-center gap-2">
          {/* <CustomButton variant="outline" onClick={() => router.push("/dashboard/stocks/manage")}>Back</CustomButton> */}
          <CustomButton loading={loading} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Stock" : "Save Stock"}
          </CustomButton>
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CustomSelect
            name="supplierId"
            control={control}
            label="Supplier"
            requiredMark
            placeholder="Select Supplier"
            options={(suppliers ?? []).map((item) => ({ label: item.name, value: String(item.id) }))}
            fieldToValue={(value: number) => (value ? String(value) : "")}
            valueToField={(value: string) => Number(value)}
          />

          <CustomSelect
            name="storeId"
            control={control}
            label="Store/Branch"
            requiredMark
            placeholder="Select Store/Branch"
            options={(stores ?? []).map((item) => ({ label: item.name, value: item.id }))}
            fieldToValue={(value: string) => value ?? ""}
            valueToField={(value: string) => value}
          />

          <CustomInput
            label="Invoice No"
            className="bg-white"
            requiredMark
            readOnly
            value={watchedInvoiceNumber ?? ""}
            error={errors.invoiceNumber?.message}
            helperText={generatingInvoice ? "Generating invoice number..." : undefined}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Create Date
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Controller
              name="createDate"
              control={control}
              render={({ field }) => (
                <DateTimeInput
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  inputClassName="h-10 bg-white"
                />
              )}
            />
            {errors.createDate?.message ? (
              <p className="text-xs text-destructive">{errors.createDate.message}</p>
            ) : null}
          </div>
        </div>

        <CustomTextArea
          label="Note"
          placeholder="Write invoice note"
          className="bg-white"
          rows={3}
          {...register("note")}
          error={errors.note?.message}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-end">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              value={nameSearchInput}
              onChange={(event) => setNameSearchInput(event.target.value)}
              placeholder="Search Product Name, ID"
              className="h-10 pl-10 bg-white"
            />
          </div>
          <div>
            <CustomSelect
              name="orderStatus"
              control={control}
              label="Order Status"
              requiredMark
              options={orderStatusOptions}
              fieldToValue={(value: StockOrderStatus) => value}
              valueToField={(value: string) => value}
            />
          </div>
        </div>

        {combinedSearchTerm ? (
          <div className="rounded-md border bg-white">
            <div className="max-h-52 overflow-y-auto">
              {searchingProducts ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Searching products...</p>
              ) : availableSearchProducts.length > 0 ? (
                availableSearchProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b px-3 py-2 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku ? `SKU: ${product.sku}` : "No SKU"} | Stock: {product.stock}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => addProduct(product)}>
                      <Plus className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </div>
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
                <TableHead>Product Name</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="w-36 text-center">Quantity</TableHead>
                <TableHead className="w-44 text-center">Purchase Price</TableHead>
                <TableHead className="w-40 text-center">Total Price</TableHead>
                <TableHead className="w-20 text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const item = watchedProducts?.[index];
                const quantity = Number(item?.quantity ?? 0);
                const purchasePrice = Number(item?.purchasePrice ?? 0);
                const totalPrice = Number((quantity * purchasePrice).toFixed(2));
                const product = productMap[field.productId];

                return (
                  <TableRow key={field.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{product?.name ?? "Unknown Product"}</div>
                      <div className="text-xs text-muted-foreground">{product?.sku ? `SKU: ${product.sku}` : "No SKU"}</div>
                      <input type="hidden" {...register(`products.${index}.productId`)} value={field.productId} />
                    </TableCell>
                    <TableCell className="text-center">{product?.stock ?? "-"}</TableCell>
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
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9 text-center"
                        {...register(`products.${index}.purchasePrice`, { valueAsNumber: true })}
                      />
                      {errors.products?.[index]?.purchasePrice?.message ? (
                        <p className="mt-1 text-xs text-destructive">{errors.products[index]?.purchasePrice?.message}</p>
                      ) : null}
                    </TableCell>
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
