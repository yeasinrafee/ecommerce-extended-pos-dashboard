"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomTextArea from "@/components/FormFields/CustomTextArea";
import Modal from "@/components/Common/Modal";
import CustomButton from "@/components/Common/CustomButton";

const schema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

type FormSchema = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormSchema>;
  onSubmit?: (data: FormSchema) => Promise<void> | void;
  submitting?: boolean;
}

export default function CreateFaq({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  submitting = false,
}: Props) {
  const isEdit = Boolean(defaultValues && defaultValues.question);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: defaultValues?.question ?? "",
      answer: defaultValues?.answer ?? "",
    },
  });

  React.useEffect(() => {
    reset({
      question: defaultValues?.question ?? "",
      answer: defaultValues?.answer ?? "",
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
      title={isEdit ? "Update FAQ" : "Add FAQ"}
      description={isEdit ? "Edit FAQ details" : "Add a new frequently asked question"}
      footer={
        <div className="flex gap-2 w-full justify-center">
          <CustomButton
            loading={isSubmitting || submitting}
            type="button"
            onClick={handleSubmit(submit)}
          >
            {isEdit ? "Update FAQ" : "Create new FAQ"}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="space-y-4">
          <CustomInput
            label="Question"
            placeholder="e.g. How do I track my order?"
            {...register("question")}
            error={errors.question?.message}
            requiredMark
          />
          <div>
            <CustomTextArea
              label="Answer"
              placeholder="Type the answer here"
              {...register("answer")}
              error={errors.answer?.message}
              requiredMark
              className="min-h-[120px]"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
