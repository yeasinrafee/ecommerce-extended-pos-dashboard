import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { AuthRoutes } from '@/routes/auth.route';
import type { ApiResponse } from '@/types/auth';
import { toast } from 'react-hot-toast';

export interface VerifyOtpPayload {
  userId: string;
  code: string;
}

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
};

const verifyOtpRequest = async (payload: VerifyOtpPayload) => {
  const response = await apiClient.post<ApiResponse<null>>(AuthRoutes.verifyOtp, payload);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Unable to verify OTP');
  }
  return { message: response.data.message };
};

export const useVerifyOtp = () => {
  return useMutation({
    mutationFn: verifyOtpRequest,
    onSuccess: (result) => {
      toast.success(result.message || 'OTP verified successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to verify OTP';
      toast.error(message);
    },
  });
};

interface SendOtpPayload {
  userId: string;
}

interface SendOtpResponse {
  otpExpiry: string | null;
}

const sendOtpRequest = async (payload: SendOtpPayload) => {
  const response = await apiClient.post<ApiResponse<SendOtpResponse>>(AuthRoutes.sendOtp, payload);
  const data = ensurePayload(response.data, 'Unable to send OTP');
  return { message: response.data.message, payload: data };
};

export const useSendOtp = () => {
  return useMutation({
    mutationFn: sendOtpRequest,
    onSuccess: (result) => {
      toast.success(result.message || 'OTP sent');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to send OTP';
      toast.error(message);
    },
  });
};

interface ForgotPasswordSendOtpPayload {
  email: string;
}

interface ForgotPasswordSendOtpResponse {
  userId: string;
  otpExpiry: string | null;
}

const forgotPasswordSendOtpRequest = async (payload: ForgotPasswordSendOtpPayload) => {
  const response = await apiClient.post<ApiResponse<ForgotPasswordSendOtpResponse>>(AuthRoutes.forgotPasswordSendOtp, payload);
  const data = ensurePayload(response.data, 'Unable to send OTP');
  return { message: response.data.message, payload: data };
};

export const useForgotPasswordSendOtp = () => {
  return useMutation({
    mutationFn: forgotPasswordSendOtpRequest,
    onSuccess: (result) => {
      toast.success(result.message || 'Reset OTP sent');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to send OTP';
      toast.error(message);
    },
  });
};

interface ForgotPasswordVerifyOtpPayload {
  userId: string;
  code: string;
}

const forgotPasswordVerifyOtpRequest = async (payload: ForgotPasswordVerifyOtpPayload) => {
  const response = await apiClient.post<ApiResponse<null>>(AuthRoutes.forgotPasswordVerifyOtp, payload);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Unable to verify OTP');
  }
  return { message: response.data.message };
};

export const useForgotPasswordVerifyOtp = () => {
  return useMutation({
    mutationFn: forgotPasswordVerifyOtpRequest,
    onSuccess: (result) => {
      toast.success(result.message || 'OTP verified successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to verify OTP';
      toast.error(message);
    },
  });
};

interface ResetPasswordPayload {
  userId: string;
  code: string;
  newPassword: string;
}

const resetPasswordRequest = async (payload: ResetPasswordPayload) => {
  const response = await apiClient.post<ApiResponse<null>>(AuthRoutes.resetPassword, payload);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Unable to reset password');
  }
  return { message: response.data.message };
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: resetPasswordRequest,
    onSuccess: (result) => {
      toast.success(result.message || 'Password reset successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to reset password';
      toast.error(message);
    },
  });
};

