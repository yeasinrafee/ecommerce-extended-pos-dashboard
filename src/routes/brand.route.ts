const brandBase = '/brands';

export const BrandRoutes = {
  getAllPaginated: `${brandBase}/get-all-paginated`,
  getAll: `${brandBase}/get-all`,
  getById: (id: string) => `${brandBase}/get/${id}`,
  create: `${brandBase}/create`,
  update: (id: string) => `${brandBase}/update/${id}`,
  delete: (id: string) => `${brandBase}/delete/${id}`
};

export default BrandRoutes;
