const storeBase = '/stores';

export const StoreRoutes = {
  getAllPaginated: `${storeBase}/get-all-paginated`,
  getAll: `${storeBase}/get-all`,
  getById: (id: string | number) => `${storeBase}/get/${id}`,
  create: `${storeBase}/create`,
  update: (id: string | number) => `${storeBase}/update/${id}`,
  updateStatusBulk: `${storeBase}/update-status`,
  delete: (id: string | number) => `${storeBase}/delete/${id}`
};

export default StoreRoutes;