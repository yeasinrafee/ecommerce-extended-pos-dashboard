const zonePolicyBase = '/zone-policies';

export const ZonePolicyRoutes = {
  getAllPaginated: `${zonePolicyBase}/get-all-paginated`,
  getAll: `${zonePolicyBase}/get-all`,
  getById: (id: string) => `${zonePolicyBase}/get/${id}`,
  create: `${zonePolicyBase}/create`,
  bulkUpdateStatus: `${zonePolicyBase}/bulk-update-status`,
  update: (id: string) => `${zonePolicyBase}/update/${id}`,
  delete: (id: string) => `${zonePolicyBase}/delete/${id}`
};

export default ZonePolicyRoutes;
