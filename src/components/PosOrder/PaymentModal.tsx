import React, { useState } from "react";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllBanks } from "@/hooks/bank.api";
import { Trash2, Plus } from "lucide-react";
import type { PosPayment } from "@/hooks/pos.api";

interface PaymentModalProps {
  totalAmount: number;
  initialPaidAmount?: number;
  onClose: () => void;
  onConfirm: (payments: PosPayment[]) => void;
  isSubmitting?: boolean;
}

export function PaymentModal({
  totalAmount,
  initialPaidAmount = 0,
  onClose,
  onConfirm,
  isSubmitting,
}: PaymentModalProps) {
  const dueAmount = Math.max(0, totalAmount - initialPaidAmount);

  const [payments, setPayments] = useState<PosPayment[]>([
    { paymentMethod: "CASH", amount: dueAmount },
  ]);

  const { data: banks = [] } = useAllBanks();

  const handleUpdatePayment = (index: number, key: keyof PosPayment, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [key]: value };
    if (key === "paymentMethod" && value !== "BANKCARD") {
      updated[index].bankId = null;
    }
    setPayments(updated);
  };

  const addPaymentRow = () => {
    const currentTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, dueAmount - currentTotal);
    setPayments([...payments, { paymentMethod: "CASH", amount: remaining }]);
  };

  const removePaymentRow = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const validPayments = payments.filter((p) => p.amount > 0);
    onConfirm(validPayments);
  };

  const totalInputted = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  // Round to fix floating point issues in comparison
  const roundedTotalInputted = Math.round(totalInputted * 100) / 100;
  const roundedDueAmount = Math.round(dueAmount * 100) / 100;
  const remainingDue = Math.max(0, dueAmount - totalInputted);
  const isMissingBank = payments.some(
    (p) => p.paymentMethod === "BANKCARD" && !p.bankId,
  );
  const isOverpaid = roundedTotalInputted > roundedDueAmount;

  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="Complete Payment"
      description="Add payment records for this order"
      footer={
        <div className="flex w-full justify-end gap-3">
          <CustomButton
            onClick={onClose}
            variant="outline"
            className="px-6"
            disabled={isSubmitting}
          >
            Cancel
          </CustomButton>
          <CustomButton
            onClick={handleConfirm}
            loading={isSubmitting}
            className="px-6"
            disabled={isOverpaid || isMissingBank}
          >
            Confirm{" "}
            {totalInputted > 0
              ? `& Pay ৳${totalInputted.toFixed(2)}`
              : "Order Only"}
          </CustomButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Payment Summary Header */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Due</p>
            <p className="text-2xl font-bold text-gray-900">৳{dueAmount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Remaining to Pay</p>
            <p
              className={`text-lg font-bold ${
                remainingDue > 0 ? "text-orange-500" : remainingDue < 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              ৳{remainingDue.toFixed(2)}
            </p>
            {isOverpaid && (
              <p className="text-xs text-red-500 font-medium">Overpayment not allowed!</p>
            )}
          </div>
        </div>

        {/* Payment Rows */}
        <div className="space-y-3 mt-4">
          {payments.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-start border border-gray-100 p-3 bg-white rounded-md relative shadow-sm">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
                      Method
                    </label>
                    <Select
                      value={p.paymentMethod}
                      onValueChange={(v) => handleUpdatePayment(idx, "paymentMethod", v)}
                    >
                      <SelectTrigger className="w-full bg-white border-gray-300">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANKCARD">Bank / Card</SelectItem>
                        <SelectItem value="BKASH">bKash</SelectItem>
                        <SelectItem value="NAGAD">Nagad</SelectItem>
                        <SelectItem value="ROCKET">Rocket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
                      Amount (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={p.amount === 0 ? "" : p.amount}
                      onChange={(e) => handleUpdatePayment(idx, "amount", parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {p.paymentMethod === "BANKCARD" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
                      Select Bank
                    </label>
                    <Select
                      value={p.bankId || ""}
                      onValueChange={(v) => handleUpdatePayment(idx, "bankId", v)}
                    >
                      <SelectTrigger className="w-full bg-white border-gray-300">
                        <SelectValue placeholder="Choose target bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bankName} - {bank.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {payments.length > 1 && (
                <button
                  type="button"
                  className="text-red-400 hover:text-red-600 p-2 shrink-0 self-center"
                  onClick={() => removePaymentRow(idx)}
                >
                  <Trash2 className="size-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {remainingDue > 0 && payments.length < 5 && (
          <button
            onClick={addPaymentRow}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            <Plus className="size-4" /> Add another payment
          </button>
        )}
      </div>
    </Modal>
  );
}
