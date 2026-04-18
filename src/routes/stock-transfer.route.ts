const stockTransferBase = "/stock-transfers";

export const StockTransferRoutes = {
	getAllPaginated: `${stockTransferBase}/get-all-paginated`,
	getById: (id: string) => `${stockTransferBase}/get/${id}`,
	searchProducts: `${stockTransferBase}/search-products`,
	generateInvoiceNumber: `${stockTransferBase}/generate-invoice-number`,
	create: `${stockTransferBase}/create`,
	bulkPatch: `${stockTransferBase}/bulk/fields`,
	patch: (id: string) => `${stockTransferBase}/${id}/fields`,
	delete: (id: string) => `${stockTransferBase}/delete/${id}`
};

export default StockTransferRoutes;