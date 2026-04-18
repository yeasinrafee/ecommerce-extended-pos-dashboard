const shippingBase = '/shipping';

export const ShippingRoutes = {
  get: `${shippingBase}/get`,
  getById: (id: string) => `${shippingBase}/get/${id}`,
  create: `${shippingBase}/create`,
  update: (id: string) => `${shippingBase}/update/${id}`,
  delete: (id: string) => `${shippingBase}/delete/${id}`,
  reset: `${shippingBase}/reset`,
};

export default ShippingRoutes;
