"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomSelect from "@/components/FormFields/CustomSelect";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";
import CustomDatePicker from "@/components/FormFields/CustomDatePicker";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useCreatePromo, useUpdatePromo } from "@/hooks/promo.api";

const schema = z
  .object({
    code: z.string().min(1, "Promo code is required").trim(),
    discountType: z.enum(["PERCENTAGE_DISCOUNT", "FLAT_DISCOUNT", "NONE"]),
    discountValue: z.coerce
      .number()
      .min(0, "Discount value must be at least 0"),
    numberOfUses: z.coerce
      .number()
      .int()
      .min(1, "Number of uses must be at least 1"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  })
  .superRefine((data, ctx) => {
    if (
      data.discountType === "PERCENTAGE_DISCOUNT" &&
      data.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage discount cannot exceed 100%",
        path: ["discountValue"],
      });
    }
  });

type FormSchema = z.infer<typeof schema>;

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<FormSchema> & { id?: string };
  inline?: boolean;
}

export default function CreatePromo({
  open = true,
  onOpenChange,
  defaultValues,
  inline = false,
}: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const router = useRouter();

  const createMutation = useCreatePromo();
  const updateMutation = useUpdatePromo();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormSchema>({
    mode: "onChange",
    resolver: zodResolver(schema) as any,
    defaultValues: {
      code: defaultValues?.code ?? "",
      discountType: defaultValues?.discountType ?? "PERCENTAGE_DISCOUNT",
      discountValue: defaultValues?.discountValue ?? 0,
      numberOfUses: defaultValues?.numberOfUses ?? 1,
      startDate: defaultValues?.startDate
        ? new Date(defaultValues.startDate).toISOString().slice(0, 10)
        : "",
      endDate: defaultValues?.endDate
        ? new Date(defaultValues.endDate).toISOString().slice(0, 10)
        : "",
    },
  });

  React.useEffect(() => {
    reset({
      code: defaultValues?.code ?? "",
      discountType: defaultValues?.discountType ?? "PERCENTAGE_DISCOUNT",
      discountValue: defaultValues?.discountValue ?? 0,
      numberOfUses: defaultValues?.numberOfUses ?? 1,
      startDate: defaultValues?.startDate
        ? new Date(defaultValues.startDate).toISOString().slice(0, 10)
        : "",
      endDate: defaultValues?.endDate
        ? new Date(defaultValues.endDate).toISOString().slice(0, 10)
        : "",
    });
  }, [defaultValues, reset]);

  const submit = async (data: FormSchema) => {
    const payload = {
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    };
    try {
      if (isEdit && defaultValues?.id) {
        await updateMutation.mutateAsync({ id: defaultValues.id, payload });
        toast.success("Promo updated successfully");
        if (onOpenChange) onOpenChange(false);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Promo created successfully");
        if (inline) {
          router.push("/dashboard/promo/manage");
        } else if (onOpenChange) {
          onOpenChange(false);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save promo");
    }
  };

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const form = (
    <form onSubmit={handleSubmit(submit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomInput
          label="Promo Code"
          {...register("code")}
          error={errors.code?.message}
          requiredMark
        />
        <CustomSelect
          name="discountType"
          control={control}
          label="Discount Type"
          requiredMark
          options={[
            { label: "Percentage Discount", value: "PERCENTAGE_DISCOUNT" },
            { label: "Flat Discount", value: "FLAT_DISCOUNT" },
          ]}
        />
        <CustomInput
          label="Discount Value"
          type="number"
          {...register("discountValue")}
          error={errors.discountValue?.message}
          requiredMark
        />
        <CustomInput
          label="Number of Uses"
          type="number"
          {...register("numberOfUses")}
          error={errors.numberOfUses?.message}
          requiredMark
        />
        <div>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <div>
                <CustomDatePicker
                  id="startDate"
                  label="Start Date"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(d) =>
                    field.onChange(d ? d.toISOString().slice(0, 10) : "")
                  }
                  requiredMark
                />
                {errors.startDate?.message && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.startDate?.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>

        <div>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <div>
                <CustomDatePicker
                  id="endDate"
                  label="End Date"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(d) =>
                    field.onChange(d ? d.toISOString().slice(0, 10) : "")
                  }
                  requiredMark
                />
                {errors.endDate?.message && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.endDate?.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">
          {isEdit ? "Update Promo" : "Create Promo"}
        </h2>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          {form}
          <div className="mt-8 flex justify-center gap-4">
            <CustomButton
              loading={isPending}
              type="button"
              onClick={handleSubmit(submit)}
              disabled={!isValid || isPending}
            >
              {isEdit ? "Update Promo" : "Create Promo"}
            </CustomButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => onOpenChange && onOpenChange(v)}
      title={isEdit ? "Update Promo" : "Create Promo"}
      description={
        isEdit ? "Edit promo details" : "Create a new promotional code"
      }
      className="w-full lg:max-w-[700px]"
      footer={
        <div className="flex gap-2 justify-center w-full">
          <CustomButton
            loading={isPending}
            type="button"
            onClick={handleSubmit(submit)}
            disabled={!isValid || isPending}
          >
            {isEdit ? "Update Promo" : "Create Promo"}
          </CustomButton>
        </div>
      }
    >
      {form}
    </Modal>
  );
}
