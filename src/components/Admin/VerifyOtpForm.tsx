"use client"

import React from "react";
import OtpInput from "@/components/FormFields/OtpInput";
import CustomButton from "@/components/Common/CustomButton";
import { useVerifyOtp } from "@/hooks/auth.api";

interface VerifyOtpFormProps {
  user: { id: string; email: string; otpExpiry?: string | null };
  onVerified: () => void;
  onResend: () => void;
  onCancel: () => void;
  isResending?: boolean;
}

export default function VerifyOtpForm({ user, onVerified, onResend, onCancel, isResending }: VerifyOtpFormProps) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message] = React.useState<string | null>(`OTP sent to ${user.email}`);
  const OTP_LENGTH = 6;

  const expiryDate = React.useMemo(() => (user.otpExpiry ? new Date(user.otpExpiry) : null), [user.otpExpiry]);
  const [remainingSeconds, setRemainingSeconds] = React.useState(() => {
    if (!expiryDate) return null as number | null;
    return Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));
  });

  const canResend = remainingSeconds !== null ? remainingSeconds <= 0 : false;

  React.useEffect(() => {
    if (!expiryDate) {
      setRemainingSeconds(null);
      return;
    }

    setRemainingSeconds(Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000)));

    const iv = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(iv);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(iv);
  }, [expiryDate]);

  const formatRemaining = (secs: number | null) => {
    if (secs === null) return null;
    if (secs <= 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const verifyOtpMutation = useVerifyOtp();

  const handleChange = (value: string) => {
    setError(null);
    setCode(value);
  };

  const handleVerify = async () => {
    if (code.length < OTP_LENGTH) return;
    try {
      await verifyOtpMutation.mutateAsync({ userId: user.id, code });
      onVerified();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid OTP code";
      setError(msg);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-slate-900">OTP verification</span>
        <span className="text-xs text-slate-500">{message}</span>
      </div>

      <OtpInput
        length={OTP_LENGTH}
        value={code}
        onChange={handleChange}
        expiry={user.otpExpiry}
      />
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : (
        (remainingSeconds === null ? (
          <p className="text-xs text-slate-500">The code expires in approximately 15 minutes.</p>
        ) : remainingSeconds <= 0 ? (
          <p className="text-xs text-rose-600">OTP has expired</p>
        ) : null)
      )}

      <div className="flex gap-2 w-full justify-center">
        <CustomButton loading={verifyOtpMutation.isPending} disabled={code.length < OTP_LENGTH || (remainingSeconds !== null && remainingSeconds <= 0)} type="button" onClick={handleVerify}>
          Verify OTP
        </CustomButton>
      </div>
      <div className="mt-2 text-center text-xs text-slate-500">
        <button
          type="button"
          className="font-semibold text-indigo-600 disabled:text-slate-400"
          onClick={onResend}
          disabled={isResending || !canResend}
        >
          Send OTP again
        </button>
      </div>
    </div>
  );
}
