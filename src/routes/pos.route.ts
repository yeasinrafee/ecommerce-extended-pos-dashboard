const posBase = "/pos";

export const PosRoutes = {
  getProducts: `${posBase}/get-products`,
  getBills: `${posBase}/bill/get-all-paginated`,
  getBill: (orderId: string) => `${posBase}/get-bill/${orderId}`,
  createBill: `${posBase}/bill/create`,
  updateBill: (orderId: string) => `${posBase}/bill/${orderId}/update`,
  deleteBill: (orderId: string) => `${posBase}/bill/${orderId}/delete`,
  addPayment: (orderId: string) => `${posBase}/bill/${orderId}/payments/add`,
  deletePayment: (orderId: string, paymentId: string) => `${posBase}/bill/${orderId}/payments/${paymentId}/delete`,
};

export default PosRoutes;
