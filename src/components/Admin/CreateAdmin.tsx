"use client"

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "@/components/Common/Modal";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomButton from "@/components/Common/CustomButton";
import { useCreateAdmin, useUpdateAdmin } from "@/hooks/admin.api";
import { useSendOtp } from "@/hooks/auth.api";
import CustomFileUpload, { type CustomFileUploadFile } from "@/components/FormFields/CustomFileUpload";
import VerifyOtpForm from "@/components/Admin/VerifyOtpForm";

const createSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("A valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"]
  });

const editSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("A valid email is required")
});

type CreateFormSchema = z.infer<typeof createSchema>;
type EditFormSchema = z.infer<typeof editSchema>;
type FormSchema = CreateFormSchema | EditFormSchema;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormSchema> & { id?: string; image?: string | null };
}

export default function CreateAdmin({ open, onOpenChange, defaultValues }: Props) {
  const isEdit = Boolean(defaultValues?.id);
  const activeSchema = isEdit ? editSchema : createSchema;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormSchema>({
    resolver: zodResolver(activeSchema),
    defaultValues: isEdit
      ? { name: defaultValues?.name ?? "", email: defaultValues?.email ?? "" }
      : { name: "", email: "", password: "", confirmPassword: "" }
  });

  React.useEffect(() => {
    reset({ name: defaultValues?.name ?? "", email: defaultValues?.email ?? "", password: undefined });
  }, [defaultValues, reset]);

  const createMutation = useCreateAdmin();
  const updateMutation = useUpdateAdmin();
  const sendOtpMutation = useSendOtp();
  const [uploadedFiles, setUploadedFiles] = React.useState<CustomFileUploadFile[]>([]);
  const [pendingVerificationUser, setPendingVerificationUser] = React.useState<{ id: string; email: string; otpExpiry?: string | null } | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPendingVerificationUser(null);
      setUploadedFiles([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (isEdit) {
      setPendingVerificationUser(null);
    }
  }, [isEdit]);

  const existingImage = defaultValues?.image;
  const showExistingImage = isEdit && existingImage && uploadedFiles.length === 0;

  const onSubmit = async (data: FormSchema) => {
    if (isEdit && defaultValues?.id) {
      const editData = data as EditFormSchema;
      if (uploadedFiles && uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.append("name", editData.name);
        formData.append("email", editData.email);
        formData.append("image", uploadedFiles[0].file);
        await updateMutation.mutateAsync({ id: defaultValues.id, payload: formData });
      } else {
        await updateMutation.mutateAsync({ id: defaultValues.id, payload: { name: editData.name, email: editData.email } });
      }
      onOpenChange(false);
      return;
    }

    if (pendingVerificationUser) {
      // already waiting for OTP verification
      return;
    }

    const createData = data as CreateFormSchema;
    const formData = new FormData();
    formData.append("name", createData.name);
    formData.append("email", createData.email);
    if (createData.password) formData.append("password", createData.password);
    if (uploadedFiles && uploadedFiles.length > 0) {
      formData.append("image", uploadedFiles[0].file);
    }

    const result = await createMutation.mutateAsync(formData);
    const email = result.payload?.email ?? "";
    setPendingVerificationUser({ id: result.payload?.id, email, otpExpiry: result.payload?.otpExpiry ?? null });
  };

  const handleOtpVerified = () => {
    setPendingVerificationUser(null);
    setUploadedFiles([]);
    reset({ name: "", email: "", password: undefined });
    onOpenChange(false);
  };

  const handleResendOtp = async () => {
    if (!pendingVerificationUser) {
      return;
    }

    const result = await sendOtpMutation.mutateAsync({ userId: pendingVerificationUser.id });
    setPendingVerificationUser({
      ...pendingVerificationUser,
      otpExpiry: result.payload?.otpExpiry ?? null,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={pendingVerificationUser ? "Verify OTP" : isEdit ? "Update Admin" : "Create Admin"}
      description={pendingVerificationUser ? "Enter the OTP sent to your email" : isEdit ? "Edit admin details" : "Create a new admin"}
      footer={
        pendingVerificationUser
          ? undefined
          : (
            <div className="flex gap-2 w-full justify-center">
              <CustomButton loading={isSubmitting} type="button" onClick={handleSubmit(onSubmit)}>
                {isEdit ? "Update Admin" : "Create Admin"}
              </CustomButton>
            </div>
          )
      }
    >
      {pendingVerificationUser ? (
        <VerifyOtpForm
          user={pendingVerificationUser}
          onVerified={handleOtpVerified}
          onResend={handleResendOtp}
          onCancel={() => setPendingVerificationUser(null)}
          isResending={sendOtpMutation.isPending}
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <CustomInput label="Name" {...register("name" as any)} error={(errors as any).name?.message} requiredMark />
            <CustomInput label="Email" {...register("email" as any)} error={(errors as any).email?.message} requiredMark />
            {!isEdit && (
              <>
                <CustomInput label="Password" type="password" {...register("password" as any)} error={(errors as any).password?.message} requiredMark />
                <CustomInput label="Confirm Password" type="password" {...register("confirmPassword" as any)} error={(errors as any).confirmPassword?.message} requiredMark />
              </>
            )}
            <div>
              <label className="block mb-2 text-sm font-medium">Profile Image</label>
              {showExistingImage ? (
                <div className="mb-2">
                  <img src={existingImage} alt="Existing" className="h-32 w-32 object-cover rounded-md" />
                  <p className="text-xs text-slate-500 mt-1">Existing image. Upload a new file below to replace.</p>
                </div>
              ) : null}
              <CustomFileUpload maxFiles={1} onFilesChange={setUploadedFiles} />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
