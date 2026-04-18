const tagBase = '/product-tags';

export const ProductTagRoutes = {
  getAllPaginated: `${tagBase}/get-all-paginated`,
  getAll: `${tagBase}/get-all`,
  getById: (id: string) => `${tagBase}/get/${id}`,
  create: `${tagBase}/create`,
  update: (id: string) => `${tagBase}/update/${id}`,
  delete: (id: string) => `${tagBase}/delete/${id}`
};

export default ProductTagRoutes;
