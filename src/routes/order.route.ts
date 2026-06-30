const orderBase = '/orders';

export const OrderRoutes = {
  create: `${orderBase}/create`,
  myOrders: `${orderBase}/my-orders`,
  getAll: `${orderBase}/all`,
  getById: (id: string) => `${orderBase}/${id}`,
  updateStatus: (id: string) => `${orderBase}/${id}/status`,
  cancel: (id: string) => `${orderBase}/${id}/cancel`,
  complete: (id: string) => `${orderBase}/${id}/complete`,
};

export default OrderRoutes;
