const supplierBase = '/suppliers';

export const SupplierRoutes = {
  getAllPaginated: `${supplierBase}/get-all-paginated`,
  getAll: `${supplierBase}/get-all`,
  getById: (id: string | number) => `${supplierBase}/get/${id}`,
  create: `${supplierBase}/create`,
  update: (id: string | number) => `${supplierBase}/update/${id}`,
  updateStatusBulk: `${supplierBase}/update-status`,
  delete: (id: string | number) => `${supplierBase}/delete/${id}`
};

export default SupplierRoutes;