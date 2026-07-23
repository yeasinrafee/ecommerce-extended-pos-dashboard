const posCustomerBase = '/pos-customers';

export const PosCustomerRoutes = {
  getPaginated: `${posCustomerBase}`,
  getById: (id: string) => `${posCustomerBase}/${id}`,
  getOrders: (id: string) => `${posCustomerBase}/${id}/orders`,
  create: `${posCustomerBase}`,
  update: (id: string) => `${posCustomerBase}/${id}`,
  delete: (id: string) => `${posCustomerBase}/${id}`,
};

export default PosCustomerRoutes;
