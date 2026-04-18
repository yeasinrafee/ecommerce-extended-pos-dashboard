const offerBase = '/offers';

export const OfferRoutes = {
	getAllPaginated: `${offerBase}/get-all-paginated`,
	getAll: `${offerBase}/get-all`,
	getById: (id: string) => `${offerBase}/get-one/${id}`,
	create: `${offerBase}/create`,
	bulkUpdateStatus: `${offerBase}/bulk-update-status`,
	update: (id: string) => `${offerBase}/update/${id}`,
	delete: (id: string) => `${offerBase}/delete/${id}`
};

export default OfferRoutes;
