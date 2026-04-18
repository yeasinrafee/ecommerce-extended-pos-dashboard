const productBase = '/products';

export const ProductRoutes = {
  getAllPaginated: `${productBase}/get-all`,
  getAll: `${productBase}/all`,
  getById: (id: string) => `${productBase}/${id}`,
  create: `${productBase}/create`,
  update: (id: string) => `${productBase}/${id}`,
  patch: (id: string) => `${productBase}/${id}/fields`,
  bulkPatch: `${productBase}/bulk/fields`,
  delete: (id: string) => `${productBase}/${id}`
};

export default ProductRoutes;