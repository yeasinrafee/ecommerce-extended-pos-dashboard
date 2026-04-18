const customerBase = '/customers';

export const CustomerRoutes = {
  getPaginated: `${customerBase}`,
  updateSelf: `${customerBase}/me`,
  bulkStatusUpdate: `${customerBase}/bulk-status`
};

export default CustomerRoutes;