"use client";
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
  HelpCircle,
  Settings,
  Store,
} from "lucide-react";
import CustomPasswordInput from "@/components/FormFields/CustomPasswordInput";
import CustomButton from "@/components/Common/CustomButton";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthRoutes } from "@/routes/auth.route";
import { useCompanyInformation } from "@/hooks/web.api";
import Image from "next/image";
import { useRouter } from "next/navigation";
import posBg from "@/assets/images/pos_bg.jpg";
import logoPos from "@/assets/images/logo_pos.jpeg";
import type { ApiResponse, AuthData, LoginCredentials } from "@/types/auth";
import {
  useForgotPasswordSendOtp,
  useForgotPasswordVerifyOtp,
  useResetPassword,
} from "@/hooks/auth.api";
import OtpInput from "@/components/FormFields/OtpInput";

const ERROR_MESSAGE =
  "Login failed. Please verify your credentials and try again.";

// Falls back to "OmniPOS Professional" when no env value is set.
const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME ?? "OmniPOS Professional";

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
const PRIMARY_BLUE = "#003d9b"; // header brand text / links
const BUTTON_BLUE = "#123FAE"; // primary CTA
const BUTTON_BLUE_DARK = "#0E2F84"; // primary CTA hover
const ICON_BLUE = "#2358E8"; // rounded icon badge

const Login = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const { data: companyInfo } = useCompanyInformation();

  const [view, setView] = useState<ViewState>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

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

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

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
      
      // Handle Remember Me functionality
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      
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
      setError("Please enter a valid email address to continue.");
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
  // Card content per view — the outer card shell (below) stays the
  // same for all three states, only the inside content swaps.
  // ---------------------------------------------------------------

  let cardContent: React.ReactNode;

  if (view === "forgot-password-otp") {
    cardContent = (
      <form onSubmit={handleVerifyOtp} className="space-y-6">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: PRIMARY_BLUE }}
          >
            Step 2 of 3
          </span>
          <span className="text-xl font-bold text-slate-900">
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
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
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
            className={`font-mono text-xs font-semibold ${
              sendOtpMutation.isPending || otpSecondsLeft > 0
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:underline"
            }`}
            style={{ color: PRIMARY_BLUE }}
          >
            {sendOtpMutation.isPending
              ? "Sending..."
              : otpSecondsLeft > 0
                ? `Resend in ${formatTime(otpSecondsLeft)}`
                : "Resend code"}
          </button>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <CustomButton
            type="submit"
            loading={verifyOtpMutation.isPending}
            disabled={otpCode.length < 6}
            className="w-full !text-white disabled:!opacity-50"
            style={{ backgroundColor: BUTTON_BLUE }}
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
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: PRIMARY_BLUE }}
          >
            Step 3 of 3
          </span>
          <span className="text-xl font-bold text-slate-900">
            Set a new password
          </span>
          <span className="text-sm text-slate-500">
            Use at least 8 characters. Make it one you haven&apos;t used before.
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
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="border-t border-slate-200 pt-5">
          <CustomButton
            type="submit"
            loading={resetPasswordMutation.isPending}
            className="w-full !text-white"
            style={{ backgroundColor: BUTTON_BLUE }}
          >
            Save new password
          </CustomButton>
        </div>
      </form>
    );
  } else {
    cardContent = (
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src={logoPos}
            alt="POS Logo"
            width={120}
            height={80}
            className="object-contain shadow-sm"
          />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-2xl font-bold text-slate-900">
            Welcome Back
          </span>
          <span className="text-sm leading-relaxed text-slate-500">
            Manage your storefront operations
          </span>
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="operator-id"
            className="text-sm font-semibold text-slate-700"
          >
            Email
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
            <input
              id="operator-id"
              type="text"
              autoComplete="username"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-11 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-transparent focus:bg-white focus:ring-2"
              style={{ ["--tw-ring-color" as any]: PRIMARY_BLUE }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="operator-password"
            className="text-sm font-semibold text-slate-700"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
            <input
              id="operator-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-transparent focus:bg-white focus:ring-2"
              style={{ ["--tw-ring-color" as any]: PRIMARY_BLUE }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4.5" />
              ) : (
                <Eye className="size-4.5" />
              )}
            </button>
          </div>
          {/* Remember me + Forgot password row */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-3 rounded border-slate-300 accent-[#1447C9] cursor-pointer"
              />
              <span className="text-[11px] font-medium text-slate-600">Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPasswordFromLogin}
              disabled={sendOtpMutation.isPending}
              aria-disabled={sendOtpMutation.isPending}
              className={`text-[11px]! font-semibold ${
                sendOtpMutation.isPending
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:underline"
              }`}
              style={{ color: PRIMARY_BLUE }}
            >
              {sendOtpMutation.isPending ? "Sending..." : "Forgot password?"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <CustomButton
          type="submit"
          loading={loading}
          className="flex w-full items-center justify-center gap-2 !text-white"
          style={{ backgroundColor: BUTTON_BLUE }}
        >
          Secure Sign In
          <ArrowRight className="size-4.5" />
        </CustomButton>

        {/* Powered by section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-center">
            <a
              href="https://yesglobaltech.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
            >
              Powered by <span className="font-semibold">Yes Global Tech</span>
            </a>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* ---------------- Top header bar ---------------- */}
      {/* <header className="relative z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-2.5">
          {companyInfo?.logo ? (
            <Image
              src={companyInfo.logo}
              alt={companyInfo?.shortDescription || "Company logo"}
              width={28}
              height={28}
              className="size-7 rounded object-contain"
            />
          ) : (
            <div
              className="flex size-7 items-center justify-center rounded"
              style={{ backgroundColor: ICON_BLUE }}
            >
              <Store className="size-4 text-white" />
            </div>
          )}
          <span className="text-lg font-bold" style={{ color: PRIMARY_BLUE }}>
            {companyInfo?.shortDescription || COMPANY_NAME}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <button aria-label="Language" className="hover:text-slate-700">
            <Globe className="size-5" />
          </button>
          <button aria-label="Help" className="hover:text-slate-700">
            <HelpCircle className="size-5" />
          </button>
          <button aria-label="Settings" className="hover:text-slate-700">
            <Settings className="size-5" />
          </button>
        </div>
      </header> */}

      {/* ---------------- Background image + overlay ---------------- */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#F5F6F8] px-4 py-10">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-[2px]"
          style={{ backgroundImage: `url(${posBg.src})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-white/70" aria-hidden="true" />

        {/* ---------------- Card ---------------- */}
        <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-slate-200/70 bg-white px-8 py-9 shadow-[0_20px_45px_-15px_rgba(24,27,32,0.25)] sm:px-10">
          {cardContent}
        </div>
      </div>

      {/* ---------------- Footer bar ---------------- */}
      {/* <footer className="relative z-20 flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 sm:flex-row">
        <span>
         BiloPOS &copy; {new Date().getFullYear()} BiloPOS Systems. All Rights
          Reserved.
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <a href="#" className="hover:text-slate-700">
            Security Policy
          </a>
          <a href="#" className="hover:text-slate-700">
            System Status
          </a>
          <a href="#" className="hover:text-slate-700">
            Contact Support
          </a>
          <button className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 hover:border-slate-300">
            <Globe className="size-3.5" />
            English (US)
          </button>
        </div>
      </footer> */}
    </div>
  );
};

export default Login;
