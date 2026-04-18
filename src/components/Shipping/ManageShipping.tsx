"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomButton from "@/components/Common/CustomButton";
import DeleteModal from "@/components/Common/DeleteModal";
import * as api from "@/hooks/shipping.api";
import WebFormSkeleton from "../Common/WebFormSkeleton";

const schema = z
  .object({
    minimumFreeShippingAmount: z.coerce
      .number()
      .min(0, "Minimum free shipping amount is required"),
    tax: z.coerce.number().min(0, "Tax is required"),
    maximumWeight: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    length: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    width: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    height: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    chargePerWeight: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    chargePerVolume: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    weightUnit: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
    volumeUnit: z.preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : v,
      z.coerce.number().optional(),
    ),
  })
  .superRefine((values, ctx) => {
    // If maximumWeight is provided, require weightUnit and chargePerWeight
    if (typeof values.maximumWeight === "number") {
      if (values.weightUnit === undefined) {
        ctx.addIssue({
          path: ["weightUnit"],
          code: z.ZodIssueCode.custom,
          message: "Weight unit is required when maximum weight is provided",
        });
      }
      if (values.chargePerWeight === undefined) {
        ctx.addIssue({
          path: ["chargePerWeight"],
          code: z.ZodIssueCode.custom,
          message:
            "Charge per weight is required when maximum weight is provided",
        });
      }
    }

    // If any volume/dimension input is provided, require all dimensions + volume unit + charge per volume
    const anyVolumeInput =
      typeof values.length === "number" ||
      typeof values.width === "number" ||
      typeof values.height === "number" ||
      typeof values.volumeUnit === "number" ||
      typeof values.chargePerVolume === "number";

    if (anyVolumeInput) {
      if (typeof values.length !== "number") {
        ctx.addIssue({
          path: ["length"],
          code: z.ZodIssueCode.custom,
          message: "Length is required when setting dimensions/volume",
        });
      }
      if (typeof values.width !== "number") {
        ctx.addIssue({
          path: ["width"],
          code: z.ZodIssueCode.custom,
          message: "Width is required when setting dimensions/volume",
        });
      }
      if (typeof values.height !== "number") {
        ctx.addIssue({
          path: ["height"],
          code: z.ZodIssueCode.custom,
          message: "Height is required when setting dimensions/volume",
        });
      }
      if (typeof values.volumeUnit !== "number") {
        ctx.addIssue({
          path: ["volumeUnit"],
          code: z.ZodIssueCode.custom,
          message: "Volume unit is required when setting dimensions/volume",
        });
      }
      if (typeof values.chargePerVolume !== "number") {
        ctx.addIssue({
          path: ["chargePerVolume"],
          code: z.ZodIssueCode.custom,
          message:
            "Charge per volume is required when setting dimensions/volume",
        });
      }
    }
  });

type FormSchema = z.infer<typeof schema>;

const EMPTY_FORM_VALUES = {
  minimumFreeShippingAmount: "",
  tax: "",
  maximumWeight: "",
  length: "",
  width: "",
  height: "",
  chargePerWeight: "",
  chargePerVolume: "",
  weightUnit: "",
  volumeUnit: "",
};

const getFormValues = (shipping: api.Shipping | null | undefined) => {
  if (!shipping) return EMPTY_FORM_VALUES;

  return {
    minimumFreeShippingAmount: shipping.minimumFreeShippingAmount ?? "",
    tax: shipping.tax ?? "",
    maximumWeight: shipping.maximumWeight ?? "",
    length: shipping.length ?? "",
    width: shipping.width ?? "",
    height: shipping.height ?? "",
    chargePerWeight: shipping.chargePerWeight ?? "",
    chargePerVolume: shipping.chargePerVolume ?? "",
    weightUnit: shipping.weightUnit ?? "",
    volumeUnit: shipping.volumeUnit ?? "",
  };
};

export default function ManageShipping() {
  const { data: shipping, isLoading } = api.useGetShipping();
  const createMutation = api.useCreateShipping();
  const updateMutation = api.useUpdateShipping();
  const resetMutation = api.useResetShipping();
  const [openDeleteModal, setOpenDeleteModal] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema) as any,
    mode: "onChange",
    defaultValues: getFormValues(shipping) as any,
  });

  const [formError, setFormError] = React.useState<string | null>(null);

  const formatError = (raw?: unknown) => {
    if (raw === undefined || raw === null) return undefined;
    const msg = String(raw);
    const lower = msg.toLowerCase();

    if (/expected number|received nan|\bnan\b/i.test(lower))
      return "Please enter a valid number";
    if (/invalid input/i.test(lower)) return "Please enter a valid value";
    if (/required/i.test(lower)) return msg;
    return msg;
  };

  React.useEffect(() => {
    reset(getFormValues(shipping) as any);
  }, [shipping, reset]);

  const onSubmit = async (data: FormSchema) => {
    setFormError(null);
    clearErrors();

    try {
      if (shipping && (shipping as any).id) {
        await updateMutation.mutateAsync({
          id: (shipping as any).id,
          payload: data as any,
        });
      } else {
        await createMutation.mutateAsync(data as any);
      }
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const nonFieldMessages: string[] = [];
        serverErrors.forEach((e: any) => {
          if (e && e.field) {
            try {
              setError(e.field as any, { type: "server", message: e.message });
            } catch (_err) {
              nonFieldMessages.push(e.message || "Invalid input");
            }
          } else if (e && e.message) {
            nonFieldMessages.push(e.message);
          }
        });

        if (nonFieldMessages.length > 0)
          setFormError(nonFieldMessages.join(". "));
      } else {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to save shipping settings";
        setFormError(message);
      }
    }
  };

  return (
    <>
      {isLoading && (
        <div className="w-full max-w-3xl mx-auto">
          <WebFormSkeleton fields={6} hasBanner={false} />
        </div>
      )}

      {!isLoading && (
        <div className="max-w-3xl bg-background border border-slate-200 rounded-md p-6 relative">
          <div className="flex justify-between lg:flex-row flex-col-reverse gap-y-4 lg:gap-y-0 lg:items-start">
            <div>
              <h2 className="mb-2 text-lg font-medium">Shipping Settings</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create or update shipping configuration. Only one record is
                allowed.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError && (
              <div className="mb-4 text-sm text-red-600" role="alert">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomInput
                label="Minimum free shipping amount"
                helperText="Amount threshold for free shipping"
                type="float"
                {...register("minimumFreeShippingAmount" as any, {
                  valueAsNumber: true,
                })}
                error={formatError(
                  (errors as any).minimumFreeShippingAmount?.message,
                )}
                requiredMark
              />

              <CustomInput
                label="Tax Percentage"
                helperText="Tax percentage or amount"
                type="float"
                {...register("tax" as any, { valueAsNumber: true })}
                error={formatError((errors as any).tax?.message)}
                requiredMark
              />

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <CustomInput
                  label="Maximum weight (grams)"
                  helperText="Optional maximum weight in grams"
                  type="float"
                  {...register("maximumWeight" as any, { valueAsNumber: true })}
                  error={formatError((errors as any).maximumWeight?.message)}
                />

                <CustomInput
                  label="Weight unit (grams)"
                  helperText="Required when maximum weight is set"
                  type="float"
                  placeholder="e.g. 1000"
                  {...register("weightUnit" as any, { valueAsNumber: true })}
                  error={formatError((errors as any).weightUnit?.message)}
                />

                <CustomInput
                  label="Charge per weight"
                  helperText="Required when maximum weight is set"
                  type="float"
                  {...register("chargePerWeight" as any, {
                    valueAsNumber: true,
                  })}
                  error={formatError((errors as any).chargePerWeight?.message)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Maximum dimensions (cm)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <CustomInput
                    label="Length (cm)"
                    helperText="Enter length in cm"
                    type="float"
                    {...register("length" as any, { valueAsNumber: true })}
                    error={formatError((errors as any).length?.message)}
                  />

                  <CustomInput
                    label="Width (cm)"
                    helperText="Enter width in cm"
                    type="float"
                    {...register("width" as any, { valueAsNumber: true })}
                    error={formatError((errors as any).width?.message)}
                  />

                  <CustomInput
                    label="Height (cm)"
                    helperText="Enter height in cm"
                    type="float"
                    {...register("height" as any, { valueAsNumber: true })}
                    error={formatError((errors as any).height?.message)}
                  />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <CustomInput
                  label="Volume unit"
                  helperText="Required when dimensions are set"
                  type="float"
                  placeholder="e.g. 1000"
                  {...register("volumeUnit" as any, { valueAsNumber: true })}
                  error={formatError((errors as any).volumeUnit?.message)}
                />

                <CustomInput
                  label="Charge per volume"
                  helperText="Required when dimensions are set"
                  type="float"
                  {...register("chargePerVolume" as any, {
                    valueAsNumber: true,
                  })}
                  error={formatError((errors as any).chargePerVolume?.message)}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col lg:flex-row justify-center items-center gap-4">
              <CustomButton
                loading={
                  isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                disabled={
                  !isValid ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                type="submit"
                className="w-full lg:w-auto"
              >
                {shipping ? "Update shipping" : "Create shipping"}
              </CustomButton>

              {shipping && (shipping as any).id && (
                <CustomButton
                  variant="primary"
                  size="md"
                  className="bg-red-500 text-white text-nowrap w-full lg:w-auto lg:absolute lg:top-6 lg:right-6"
                  loading={resetMutation.isPending}
                  type="button"
                  onClick={() => setOpenDeleteModal(true)}
                >
                  Reset all
                </CustomButton>
              )}
            </div>

            <DeleteModal
              open={openDeleteModal}
              onOpenChange={setOpenDeleteModal}
              title="Reset shipping settings"
              description={
                "This will permanently delete the shipping record from the database and reset all form values."
              }
              onConfirm={async () => {
                try {
                  await resetMutation.mutateAsync();
                  reset(EMPTY_FORM_VALUES as any);
                  setOpenDeleteModal(false);
                } catch (err: any) {
                  const serverErrors = err?.response?.data?.errors;
                  if (Array.isArray(serverErrors) && serverErrors.length > 0) {
                    const nonFieldMessages: string[] = [];
                    serverErrors.forEach((e: any) => {
                      if (e && e.message) nonFieldMessages.push(e.message);
                    });
                    if (nonFieldMessages.length > 0)
                      setFormError(nonFieldMessages.join(". "));
                  } else {
                    const message =
                      err?.response?.data?.message ||
                      err?.message ||
                      "Failed to reset shipping settings";
                    setFormError(message);
                  }
                }
              }}
              loading={resetMutation.isPending}
              confirmLabel="Reset"
            />
          </form>
        </div>
      )}
    </>
  );
}
