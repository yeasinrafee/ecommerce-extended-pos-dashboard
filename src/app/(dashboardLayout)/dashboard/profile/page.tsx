"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomPasswordInput from "@/components/FormFields/CustomPasswordInput";
import CustomFileUpload, {
  type CustomFileUploadFile,
} from "@/components/FormFields/CustomFileUpload";
import CustomButton from "@/components/Common/CustomButton";
import { useAdminProfile, useUpdateAdminProfile } from "@/hooks/admin.api";
import WebFormSkeleton from "@/components/Common/WebFormSkeleton";

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    oldPassword: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => v === "" || (typeof v === "string" && v.length >= 8), {
        message: "Old password must be at least 8 characters",
      }),
    newPassword: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => v === "" || (typeof v === "string" && v.length >= 8), {
        message: "New password must be at least 8 characters",
      }),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword && data.newPassword.length > 0) {
      if (!data.oldPassword || data.oldPassword.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Old password is required to set a new password",
          path: ["oldPassword"],
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });
      }
    }
  });

type FormSchema = z.infer<typeof schema>;

const ProfilePage = () => {
  const { data: profile, isLoading } = useAdminProfile();
  const updateMutation = useUpdateAdminProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isDirty },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const [uploadedFiles, setUploadedFiles] = React.useState<
    CustomFileUploadFile[]
  >([]);

  React.useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        email: profile.user?.email || "",
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: FormSchema) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    if (data.oldPassword) formData.append("oldPassword", data.oldPassword);
    if (data.newPassword) formData.append("newPassword", data.newPassword);

    if (uploadedFiles.length > 0) {
      formData.append("image", uploadedFiles[0].file);
    }

    try {
      await updateMutation.mutateAsync(formData);
      setUploadedFiles([]);
      reset({
        name: data.name,
        email: data.email,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        error.response.data.errors.forEach((err: any) => {
          if (err.field) {
            setError(err.field as any, {
              type: "server",
              message: err.message,
            });
          }
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <WebFormSkeleton fields={2} hasBanner={true} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 bg-white rounded-xl border">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-slate-500 text-sm">
          Update your account information
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium">Avatar</label>
          <div className="space-y-4">
            {uploadedFiles.length === 0 && profile?.image && (
              <div className="mb-2">
                <div className="h-32 w-32 rounded-md border bg-slate-50 overflow-hidden">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Existing avatar. Upload a new file below to replace.
                </p>
              </div>
            )}

            <div className="flex-1">
              <CustomFileUpload
                label="Upload new avatar"
                maxFiles={1}
                onFilesChange={setUploadedFiles}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CustomInput
            label="Full Name"
            {...register("name")}
            error={errors.name?.message}
            placeholder="Your name"
          />
          <CustomInput
            label="Email Address"
            {...register("email")}
            error={errors.email?.message}
            placeholder="your@email.com"
          />

          <div className="pt-4 border-t mt-4 mb-2">
            <h3 className="text-md font-semibold text-slate-800 mb-4">
              Change Password
            </h3>
            <div className="space-y-4">
              <CustomPasswordInput
                label="Old Password"
                {...register("oldPassword")}
                error={errors.oldPassword?.message}
                placeholder="Enter current password"
              />
              <CustomPasswordInput
                label="New Password"
                {...register("newPassword")}
                error={errors.newPassword?.message}
                placeholder="Enter new password"
              />
              <CustomPasswordInput
                label="Confirm New Password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <CustomButton
              type="submit"
              loading={updateMutation.isPending}
              disabled={(!isDirty && uploadedFiles.length === 0) || !isValid}
            >
              Save Changes
            </CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
