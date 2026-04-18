const catBase = '/product-categories';

export const ProductCategoryRoutes = {
  getAllPaginated: `${catBase}/get-all-paginated`,
  getParentPaginated: `${catBase}/get-parent-categories-paginated`,
  getAll: `${catBase}/get-all`,
  getById: (id: string) => `${catBase}/get/${id}`,
  create: `${catBase}/create`,
  update: (id: string) => `${catBase}/update/${id}`,
  delete: (id: string) => `${catBase}/delete/${id}`
};

export default ProductCategoryRoutes;
