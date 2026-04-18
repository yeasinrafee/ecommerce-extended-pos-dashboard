const authBase = '/auth';

export const AuthRoutes = {
  login: `${authBase}/login`,
  refresh: `${authBase}/refresh`,
  logout: `${authBase}/logout`,
  createAdmin: `${authBase}/admin/create`,
  verifyOtp: `${authBase}/otp/verify`,
  sendOtp: `${authBase}/otp/send`,
  forgotPasswordSendOtp: `${authBase}/forgot-password/send-otp`,
  forgotPasswordVerifyOtp: `${authBase}/forgot-password/verify-otp`,
  resetPassword: `${authBase}/forgot-password/reset`
};

export default AuthRoutes;