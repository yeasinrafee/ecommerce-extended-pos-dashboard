"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  link: z.string().url("Must be a valid URL").min(1, "Link is required"),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormSchema>;
  onSubmit?: (data: FormSchema) => Promise<void> | void;
  submitting?: boolean;
}

export default function CreateSocialMedia({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  submitting = false,
}: Props) {
  const isEdit = Boolean(defaultValues && defaultValues.name);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      link: defaultValues?.link ?? "",
    },
  });

  React.useEffect(() => {
    reset({
      name: defaultValues?.name ?? "",
      link: defaultValues?.link ?? "",
    });
  }, [defaultValues, reset]);

  const submit = async (data: FormSchema) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title={isEdit ? "Update Social Media Link" : "Add Social Media Link"}
      description={isEdit ? "Edit social media details" : "Add a new social media platform"}
      footer={
        <div className="flex gap-2 w-full justify-center">
          <CustomButton
            loading={isSubmitting || submitting}
            type="button"
            onClick={handleSubmit(submit)}
          >
            {isEdit ? "Update social media" : "Add social media"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput
            label="Platform Name"
            placeholder="e.g. Facebook"
            {...register("name")}
            error={errors.name?.message}
            requiredMark
          />
          <CustomInput
            label="Link"
            placeholder="e.g. https://facebook.com/company"
            {...register("link")}
            error={errors.link?.message}
            requiredMark
          />
        </div>
      </form>
    </Modal>
  );
}
