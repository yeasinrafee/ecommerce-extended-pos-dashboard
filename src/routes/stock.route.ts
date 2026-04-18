const stockBase = '/stocks';

export const StockRoutes = {
  getAllPaginated: `${stockBase}/get-all-paginated`,
  getById: (id: string) => `${stockBase}/get/${id}`,
  generateInvoiceNumber: `${stockBase}/generate-invoice-number`,
  create: `${stockBase}/create`,
  bulkPatch: `${stockBase}/bulk/fields`,
  update: (id: string) => `${stockBase}/update/${id}`,
  delete: (id: string) => `${stockBase}/delete/${id}`
};

export default StockRoutes;
