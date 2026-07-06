"use client";
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import CustomInput from "@/components/FormFields/CustomInput";
import CustomPasswordInput from "@/components/FormFields/CustomPasswordInput";
import CustomButton from "@/components/Common/CustomButton";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthRoutes } from "@/routes/auth.route";
import { useCompanyInformation } from "@/hooks/web.api";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ApiResponse, AuthData, LoginCredentials } from "@/types/auth";
import {
  useForgotPasswordSendOtp,
  useForgotPasswordVerifyOtp,
  useResetPassword,
} from "@/hooks/auth.api";
import OtpInput from "@/components/FormFields/OtpInput";

const ERROR_MESSAGE =
  "Login failed. Please verify your credentials and try again.";

// Falls back to "POS Dashboard" (rendered in caps via CSS) when no env value is set.
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "POS Dashboard";

const resolveErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return ERROR_MESSAGE;
};

type ViewState = "login" | "forgot-password-otp" | "reset-password";

// ---- design tokens (kept local so this file stays drop-in) ----
const INK = "#181B20";
const PANEL = "#1F232B";
const REGISTER_GREEN = "#0E7C5A";
const REGISTER_GREEN_DARK = "#0B6748";
const MUTED = "#8A93A3";

const Login = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const { data: companyInfo } = useCompanyInformation();

  const [view, setView] = useState<ViewState>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetUserId, setResetUserId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiry, setOtpExpiry] = useState<string | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState<number>(0);
  const otpTimerRef = useRef<number | null>(null);

  const sendOtpMutation = useForgotPasswordSendOtp();
  const verifyOtpMutation = useForgotPasswordVerifyOtp();
  const resetPasswordMutation = useResetPassword();

  const resetPasswordSchema = z
    .object({
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z
        .string()
        .min(8, "Confirm password must be at least 8 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });

  type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmitReset = async (data: ResetPasswordForm) => {
    try {
      await resetPasswordMutation.mutateAsync({
        userId: resetUserId,
        code: otpCode,
        newPassword: data.password,
      });
      setView("login");
      setForgotEmail("");
      setOtpCode("");
      setOtpExpiry(null);
      setResetUserId("");
    } catch (err: unknown) {
      const message = resolveErrorMessage(err);
      setError(message);
      // toast.error(message);
    }
  };

  const handleLoginSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const credentials: LoginCredentials = {
      email: email.trim(),
      password,
    };

    try {
      const response = await apiClient.post<ApiResponse<AuthData>>(
        AuthRoutes.login,
        credentials,
      );
      const payload = response.data.data;
      if (!payload) {
        throw new Error("Invalid login response");
      }
      // Support both server shapes: { data: { user: {...} } } and { data: { ...userFields } }
      const user = (payload as any).user ?? payload;
      if (!user || !user.email) {
        throw new Error("Invalid user data in login response");
      }

      const stored = {
        email: user.email,
        role: user.role,
        name: user.name,
        image: user.image,
      };

      // Set user in store before navigation so dashboard has the auth state available
      setUser(stored);
      setPassword("");
      toast.success(`Welcome, ${user.name || "User"}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = resolveErrorMessage(err);
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sendOtpMutation.mutateAsync({
        email: forgotEmail.trim(),
      });
      if (res.payload) {
        setResetUserId(res.payload.userId);
        setOtpExpiry(res.payload.otpExpiry);
        setOtpCode("");
        setView("forgot-password-otp");
      }
    } catch (err: any) {}
  };

  const handleForgotPasswordFromLogin = async (
    e?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setError(null);
    const emailValue = email.trim();
    if (!emailValue) {
      setError("Please enter your email to reset your password.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const res = await sendOtpMutation.mutateAsync({ email: emailValue });
      if (res.payload) {
        setResetUserId(res.payload.userId);
        setOtpExpiry(res.payload.otpExpiry);
        setForgotEmail(emailValue);
        setOtpCode("");
        setView("forgot-password-otp");
      } else {
        throw new Error("Failed to send OTP");
      }
    } catch (err: unknown) {
      const message = resolveErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    if (!otpExpiry) {
      setOtpSecondsLeft(0);
      return;
    }

    if (otpTimerRef.current) {
      clearInterval(otpTimerRef.current);
      otpTimerRef.current = null;
    }

    const msLeft = new Date(otpExpiry).getTime() - Date.now();
    let seconds = Math.max(0, Math.ceil(msLeft / 1000));
    setOtpSecondsLeft(seconds);

    if (seconds > 0) {
      const id = window.setInterval(() => {
        setOtpSecondsLeft((prev) => {
          if (prev <= 1) {
            if (otpTimerRef.current) {
              clearInterval(otpTimerRef.current);
              otpTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      otpTimerRef.current = id;
      return () => {
        if (otpTimerRef.current) {
          clearInterval(otpTimerRef.current);
          otpTimerRef.current = null;
        }
        clearInterval(id);
      };
    }
  }, [otpExpiry]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleResendOtp = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    setError(null);
    const emailValue = forgotEmail.trim();
    if (!emailValue) {
      setError("No email available to resend OTP.");
      return;
    }
    try {
      const res = await sendOtpMutation.mutateAsync({ email: emailValue });
      if (res.payload) {
        setResetUserId(res.payload.userId);
        setOtpExpiry(res.payload.otpExpiry);
        setOtpCode("");
        // toast.success("OTP resent to your email.");
      } else {
        throw new Error("Failed to resend OTP");
      }
    } catch (err: unknown) {
      const message = resolveErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    try {
      await verifyOtpMutation.mutateAsync({
        userId: resetUserId,
        code: otpCode,
      });
      setView("reset-password");
    } catch (err: any) {}
  };

  // ---------------------------------------------------------------
  // Card content per view — the outer "receipt" shell (below) stays
  // the same for all three states, only the inside content swaps.
  // ---------------------------------------------------------------

  let cardContent: React.ReactNode;

  if (view === "forgot-password-otp") {
    cardContent = (
      <form onSubmit={handleVerifyOtp} className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0E7C5A]">
            Step 2 of 3
          </span>
          <span className="text-lg font-semibold text-slate-900">
            Enter verification code
          </span>
          <span className="text-sm text-slate-500">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-slate-700">{forgotEmail}</span>
          </span>
        </div>

        <OtpInput
          length={6}
          value={otpCode}
          onChange={setOtpCode}
          expiry={otpExpiry}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-center gap-x-2 text-sm">
          <span className="text-xs text-slate-500">
            Didn&apos;t get the code?
          </span>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={sendOtpMutation.isPending || otpSecondsLeft > 0}
            aria-disabled={sendOtpMutation.isPending || otpSecondsLeft > 0}
            className={`font-mono text-xs font-semibold text-[#0E7C5A] ${
              sendOtpMutation.isPending || otpSecondsLeft > 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:text-[#0B6748] cursor-pointer"
            }`}
          >
            {sendOtpMutation.isPending
              ? "Sending..."
              : otpSecondsLeft > 0
                ? `Resend in ${formatTime(otpSecondsLeft)}`
                : "Resend code"}
          </button>
        </div>

        {/* receipt-style dashed divider, like a subtotal line */}
        <div className="border-t border-dashed border-slate-300 pt-5">
          <CustomButton
            type="submit"
            loading={verifyOtpMutation.isPending}
            disabled={otpCode.length < 6}
            className="w-full !bg-[#0E7C5A] hover:!bg-[#0B6748] !text-white disabled:!opacity-50"
          >
            Verify code
          </CustomButton>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setView("login");
            }}
            className="mt-3 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to sign in
          </button>
        </div>
      </form>
    );
  } else if (view === "reset-password") {
    cardContent = (
      <form onSubmit={handleSubmit(onSubmitReset)} className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0E7C5A]">
            Step 3 of 3
          </span>
          <span className="text-lg font-semibold text-slate-900">
            Set a new password
          </span>
          <span className="text-sm text-slate-500">
            Use at least 8 characters. Make it one you haven&apos;t used
            before.
          </span>
        </div>

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <CustomPasswordInput
              label="New password"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onValueChange={(v) => field.onChange(v ?? "")}
              required
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <CustomPasswordInput
              label="Confirm new password"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onValueChange={(v) => field.onChange(v ?? "")}
              required
              error={errors.confirmPassword?.message}
            />
          )}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="border-t border-dashed border-slate-300 pt-5">
          <CustomButton
            type="submit"
            loading={resetPasswordMutation.isPending}
            className="w-full !bg-[#0E7C5A] hover:!bg-[#0B6748] !text-white"
          >
            Save new password
          </CustomButton>
        </div>
      </form>
    );
  } else {
    cardContent = (
      <form onSubmit={handleLoginSubmit} className="space-y-6">
        <div className="flex flex-col gap-1.5 mb-2">
          <span className="text-lg font-semibold text-slate-900">
            Sign in
          </span>
          <span className="text-sm text-slate-500">
            Welcome back — pick up your shift where you left off.
          </span>
        </div>

        <CustomInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <CustomPasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={handleForgotPasswordFromLogin}
            disabled={sendOtpMutation.isPending}
            aria-disabled={sendOtpMutation.isPending}
            className={`text-xs font-semibold text-[#0E7C5A] ${
              sendOtpMutation.isPending
                ? "opacity-50 cursor-not-allowed"
                : "hover:text-[#0B6748] cursor-pointer"
            }`}
          >
            {sendOtpMutation.isPending ? "Sending..." : "Forgot password?"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* receipt-style dashed divider, like the line above a total */}
        <div className="border-t border-dashed border-slate-300 pt-5">
          <CustomButton
            type="submit"
            loading={loading}
            className="w-full !bg-[#003d9b] hover:!bg-[#003d9b]/90 !text-white"
          >
            Sign in
          </CustomButton>
        </div>
      </form>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#F5F6F8]">
      {/* perforated "receipt" edge, scoped to this page only */}
      <style>{`
        .pos-receipt-card { position: relative; }
        .pos-receipt-card::before {
          content: "";
          position: absolute;
          top: -9px;
          left: 0;
          right: 0;
          height: 18px;
          background-image: radial-gradient(circle at 9px 9px, transparent 8px, #F5F6F8 9px);
          background-size: 18px 18px;
          background-repeat: repeat-x;
        }
        .pos-barcode {
          background-image: repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.9) 0px,
            rgba(255,255,255,0.9) 2px,
            transparent 2px,
            transparent 5px,
            rgba(255,255,255,0.55) 5px,
            rgba(255,255,255,0.55) 6px,
            transparent 6px,
            transparent 10px
          );
        }
      `}</style>

      {/* Left: brand / register panel — hidden on small screens */}
      <div
        className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ backgroundColor: PANEL }}
      >
        <div className="pos-barcode absolute inset-x-12 top-12 h-10 opacity-20" />

        <div className="relative flex items-center gap-3">
          {companyInfo?.logo ? (
            <Image
              src={companyInfo.logo}
              alt={companyInfo?.shortDescription || "Company logo"}
              width={40}
              height={40}
              className="size-10 object-contain rounded"
            />
          ) : (
            <div
              className="size-10 rounded-md flex items-center justify-center font-mono text-sm font-bold text-white"
              style={{ backgroundColor: REGISTER_GREEN }}
            >
              $
            </div>
          )}
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
            {companyInfo?.shortDescription || COMPANY_NAME}
          </span>
        </div>

        <div className="relative max-w-sm">
          <p className="text-3xl font-bold leading-tight text-white tracking-tight">
            Every sale, every shift,
            <br />
            one register.
          </p>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: MUTED }}>
            Sign in to track orders, manage inventory, and close out the till
            without missing a beat.
          </p>
        </div>

        <div className="relative flex items-center gap-2 font-mono text-[11px]" style={{ color: MUTED }}>
          <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: REGISTER_GREEN }} />
          Secure, encrypted sign-in
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* mobile-only brand mark */}
          <div className="lg:hidden mb-8 flex flex-col items-center gap-3">
            {companyInfo?.logo ? (
              <Image
                src={companyInfo.logo}
                alt={companyInfo?.shortDescription || "Company logo"}
                width={56}
                height={56}
                className="size-14 object-contain"
              />
            ) : (
              <div
                className="size-12 rounded-md flex items-center justify-center font-mono text-base font-bold text-white"
                style={{ backgroundColor: REGISTER_GREEN }}
              >
                $
              </div>
            )}
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-800">
              {companyInfo?.shortDescription || COMPANY_NAME}
            </span>
          </div>

          <div className="pos-receipt-card bg-white rounded-b-xl shadow-[0_20px_45px_-15px_rgba(24,27,32,0.25)] border border-slate-200/70 px-7 sm:px-9 pt-9 pb-8">
            {cardContent}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Trouble signing in? Contact your store administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;