const promoBase = '/promos';

export const PromoRoutes = {
  getAllPaginated: `${promoBase}/get-all-paginated`,
  getAll: `${promoBase}/get-all`,
  getById: (id: string) => `${promoBase}/get/${id}`,
  create: `${promoBase}/create`,
  update: (id: string) => `${promoBase}/update/${id}`,
  delete: (id: string) => `${promoBase}/delete/${id}`
};

export default PromoRoutes;
