"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "@/components/Common/Modal";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomButton from "@/components/Common/CustomButton";
import { useCreateBank, useUpdateBank } from "@/hooks/bank.api";

const schema = z.object({
  bankName: z.string().trim().min(2, "Bank name is required"),
  branch: z.string().trim().min(2, "Branch is required"),
  accountNumber: z.string().trim().min(2, "Account number is required"),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormSchema> & { id?: string };
}

export default function CreateBank({ open, onOpenChange, defaultValues }: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankName: defaultValues?.bankName ?? "",
      branch: defaultValues?.branch ?? "",
      accountNumber: defaultValues?.accountNumber ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) return;

    reset({
      bankName: defaultValues?.bankName ?? "",
      branch: defaultValues?.branch ?? "",
      accountNumber: defaultValues?.accountNumber ?? "",
    });
  }, [defaultValues, open, reset]);

  const submit = async (data: FormSchema) => {
    const payload = {
      bankName: data.bankName,
      branch: data.branch,
      accountNumber: data.accountNumber,
    };

    if (isEdit && defaultValues?.id) {
      await updateMutation.mutateAsync({ id: defaultValues.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    reset({ bankName: "", branch: "", accountNumber: "" });
    onOpenChange(false);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Update Bank" : "Create Bank"}
      description={isEdit ? "Edit bank account details" : "Add a new bank account"}
      footer={
        <div className="flex w-full justify-center gap-2">
          <CustomButton loading={loading || isSubmitting} type="button" onClick={handleSubmit(submit)}>
            {isEdit ? "Update Bank" : "Create Bank"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput label="Bank Name" {...register("bankName")} error={errors.bankName?.message} requiredMark />
          <CustomInput label="Branch" {...register("branch")} error={errors.branch?.message} requiredMark />
          <CustomInput label="Account Number" {...register("accountNumber")} error={errors.accountNumber?.message} requiredMark />
        </div>
      </form>
    </Modal>
  );
}
