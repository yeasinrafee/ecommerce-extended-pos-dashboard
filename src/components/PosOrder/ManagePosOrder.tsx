"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Receipt,
  Package,
  Printer,
  CreditCard,
} from "lucide-react";
import Table, { type Column } from "@/components/Common/Table";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePosBills,
  usePosBill,
  useDeletePosBill,
  useAddPosPayment,
  type PosBillSummary,
} from "@/hooks/pos.api";
import Image from "next/image";
import { PaymentModal } from "./PaymentModal";
import { cn } from "@/lib/utils";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ManagePosOrder: React.FC = () => {
  const router = useRouter();

  /* ── pagination ── */
  const [page, setPage] = React.useState(1);
  const limit = 20;

  /* ── data ── */
  const { data: paged, isLoading } = usePosBills(page, limit);
  const bills = paged?.data ?? [];
  const total = paged?.meta?.total ?? 0;

  /* ── delete modal ── */
  const [deleteTarget, setDeleteTarget] = React.useState<PosBillSummary | null>(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const deleteMutation = useDeletePosBill();

  const handleDelete = (bill: PosBillSummary) => {
    setDeleteTarget(bill);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch {
      // toast handled in hook
    }
  };

  /* ── add payment modal ── */
  const [paymentTarget, setPaymentTarget] =
    React.useState<PosBillSummary | null>(null);
  const addPaymentMutation = useAddPosPayment();

  const handleAddPaymentClick = (bill: PosBillSummary) => {
    setPaymentTarget(bill);
  };

  const handleConfirmPayments = async (
    payments: import("@/hooks/pos.api").PosPayment[],
  ) => {
    if (!paymentTarget) return;
    try {
      await addPaymentMutation.mutateAsync({
        orderId: paymentTarget.id,
        payments,
      });
      setPaymentTarget(null);
    } catch {
      // toast handled in hook
    }
  };

  /* ── view bill detail modal ── */
  const [viewBillId, setViewBillId] = React.useState<string | null>(null);
  const { data: billDetail, isLoading: billDetailLoading } = usePosBill(
    viewBillId ?? "",
  );

  /* ── handle printing ── */
  const handlePrint = async (billId: string) => {
    try {
      const { fetchPosBill } = await import("@/hooks/pos.api");
      const { printPosReceipt } = await import("@/utils/posPrint");
      const data = await fetchPosBill(billId);
      printPosReceipt(data);
    } catch (e) {
      console.error("Failed to fetch bill for printing", e);
    }
  };

  /* ── edit navigation ── */
  const handleEdit = (bill: PosBillSummary) => {
    router.push(`/dashboard/pos-order/create?editId=${bill.id}`);
  };

  /* ── table columns ── */
  const columns = React.useMemo<Column<PosBillSummary>[]>(
    () => [
      {
        header: "Invoice",
        cell: (row) => (
          <span className="font-mono text-xs tracking-wide">
            #{row.invoiceNumber?.slice(-6) ?? "---"}
          </span>
        ),
      },
      {
        header: "Cashier",
        cell: (row) => (
          <span className="text-sm">{row.processedBy?.adminName ?? "—"}</span>
        ),
      },
      {
        header: "Items",
        cell: (row) => (
          <Badge variant="secondary" className="font-mono">
            {row.totalQuantity}
          </Badge>
        ),
        align: "center",
      },
      {
        header: "Amount",
        cell: (row) => (
          <span className="font-semibold text-brand-primary">
            ৳{row.totalAmount?.toFixed(2)}
          </span>
        ),
        align: "right",
      },
      {
        header: "Payment",
        cell: (row) => {
          const methods = Array.from(
            new Set(row.payments?.map((p) => p.paymentMethod) || []),
          );
          const methodStr = methods.length > 0 ? methods.join(", ") : "—";
          const totalPaid =
            row.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const displayStatus = totalPaid >= row.totalAmount ? "PAID" : "DUE";

          return (
            <div className="flex flex-col items-center">
              <Badge
                className={
                  displayStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-rose-100 text-rose-800 border-rose-200"
                }
                variant="outline"
              >
                {displayStatus}
              </Badge>
              <span className="text-[10px] text-gray-500 mt-0.5 uppercase font-medium">
                {methodStr}
              </span>
            </div>
          );
        },
        align: "center",
      },
      {
        header: "Date",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            {new Date(row.createdAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
    ],
    [],
  );

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ render ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return (
    <div className="space-y-4">
      {/* header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Receipt className="size-5 text-brand-primary" />
          Manage POS Bills
        </h2>

        <CustomButton
          onClick={() => router.push("/dashboard/pos-order/create")}
          size="md"
        >
          + New Bill
        </CustomButton>
      </div>

      {/* table */}
      <Table<PosBillSummary>
        columns={columns}
        data={bills}
        rowKey="id"
        pageSize={limit}
        serverSide
        currentPage={page}
        totalItems={total}
        onPageChange={setPage}
        renderRowActions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewBillId(item.id)}>
                <Eye className="size-4 mr-2" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrint(item.id)}>
                <Printer className="size-4 mr-2" /> Print
              </DropdownMenuItem>
              {item.paymentStatus !== "PAID" && (
                <DropdownMenuItem onClick={() => handleAddPaymentClick(item)}>
                  <CreditCard className="size-4 mr-2" /> Add Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleEdit(item)}>
                <Pencil className="size-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDelete(item)}
              >
                <Trash2 className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* add payment modal */}
      {paymentTarget && (
        <PaymentModal
          totalAmount={paymentTarget.totalAmount}
          initialPaidAmount={
            paymentTarget.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
          }
          onClose={() => setPaymentTarget(null)}
          onConfirm={handleConfirmPayments}
          isSubmitting={addPaymentMutation.isPending}
        />
      )}

      {/* delete confirmation */}
      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete POS Bill"
        description={
          deleteTarget
            ? `Are you sure you want to delete invoice #${deleteTarget.invoiceNumber?.slice(-6)}? This action cannot be undone.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />

      {/* ── Bill detail view dialog ── */}
      <Dialog
        open={!!viewBillId}
        onOpenChange={(open) => {
          if (!open) setViewBillId(null);
        }}
      >
        <DialogContent className="max-w-2xl h-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pb-2 border-b">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Receipt className="size-5 text-brand-primary" />
                {billDetail?.invoiceNumber
                  ? `Order #${billDetail.invoiceNumber.slice(-8)}`
                  : "Order Details"}
              </DialogTitle>
              <DialogDescription>
                View full transaction and payment details
              </DialogDescription>
            </div>
            {billDetail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrint(billDetail.id)}
                className="gap-2"
              >
                <Printer className="size-4" /> Print
              </Button>
            )}
          </DialogHeader>

          {billDetailLoading || !billDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-brand-primary border-r-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 -mx-6 min-h-0 custom-scrollbar">
              <div className="space-y-5 pb-4">
                {/* meta info cards */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Cashier"
                    value={
                      billDetail.cashier?.name ??
                      billDetail.cashier?.email ??
                      "—"
                    }
                  />
                  <InfoCard
                    label="Store"
                    value={billDetail.store?.name ?? "No store"}
                  />
                  <InfoCard
                    label="Date"
                    value={
                      billDetail.createdAt
                        ? new Date(billDetail.createdAt).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "—"
                    }
                  />
                  <InfoCard
                    label="Total Items"
                    value={`${billDetail.summary.totalQuantity} pcs (${billDetail.summary.totalItems} lines)`}
                  />
                </div>

                {/* items list */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Items
                  </h4>
                  <div className="space-y-2">
                    {billDetail.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 rounded-lg border bg-muted/10"
                      >
                        <div className="size-12 rounded-md overflow-hidden bg-muted/30 shrink-0">
                          {item.productImage ? (
                            <Image
                              src={item.productImage}
                              alt=""
                              width={48}
                              height={48}
                              className="object-cover size-12"
                            />
                          ) : (
                            <div className="flex items-center justify-center size-12">
                              <Package className="size-5 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.productName}
                          </p>
                          {item.variations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.variations.map((v) => (
                                <Badge
                                  key={v.id}
                                  variant="outline"
                                  className="text-[10px] font-normal"
                                >
                                  {v.attributeName}: {v.attributeValue}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            SKU: {item.productSku} · Qty: {item.quantity}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-brand-primary">
                            ৳{item.lineFinalTotal.toFixed(2)}
                          </p>
                          {item.lineBaseTotal > item.lineFinalTotal && (
                            <p className="text-xs text-muted-foreground line-through">
                              ৳{item.lineBaseTotal.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* payments and totals section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  {/* Payment History */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <CreditCard className="size-4" /> Payment History
                    </h4>
                    {billDetail.payments && billDetail.payments.length > 0 ? (
                      <div className="space-y-2">
                        {billDetail.payments.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md border border-gray-100"
                          >
                            <div>
                              <p className="font-bold text-gray-900">
                                {p.paymentMethod}
                              </p>
                              <p className="text-[10px] text-gray-500 uppercase">
                                {p.createdAt
                                  ? new Date(p.createdAt).toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                            <span className="font-bold text-blue-600">
                              ৳{p.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed rounded-lg text-center text-gray-400 text-xs text-muted-foreground uppercase">
                        No payments recorded
                      </div>
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 p-4 border rounded-xl space-y-3 h-fit">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>৳{billDetail.baseAmount.toFixed(2)}</span>
                    </div>
                    {billDetail.baseAmount > billDetail.finalAmount && (
                      <div className="flex justify-between text-sm text-rose-600 font-medium">
                        <span>Discount</span>
                        <span>
                          -৳
                          {(
                            billDetail.baseAmount - billDetail.finalAmount
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-gray-900">
                        ৳{billDetail.finalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between text-sm font-bold text-emerald-600">
                        <span>Paid Amount</span>
                        <span>
                          ৳
                          {(
                            billDetail.payments?.reduce(
                              (s, p) => s + p.amount,
                              0,
                            ) || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-rose-600 pt-2 border-t border-dashed">
                        <span>Balance Due</span>
                        <span>
                          ৳
                          {Math.max(
                            0,
                            billDetail.finalAmount -
                              (billDetail.payments?.reduce(
                                (s, p) => s + p.amount,
                                0,
                              ) || 0),
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-full justify-center py-1 text-xs font-bold uppercase",
                          (billDetail.payments?.reduce(
                            (s, p) => s + p.amount,
                            0,
                          ) || 0) >= billDetail.finalAmount
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-rose-500 text-white border-rose-500",
                        )}
                      >
                        {(billDetail.payments?.reduce(
                          (s, p) => s + p.amount,
                          0,
                        ) || 0) >= billDetail.finalAmount
                          ? "Fully Paid"
                          : "Payment Due"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePosOrder;

/* ── tiny helper component ── */
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/10 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}
