const locationBase = '/stocks/locations';

export const LocationRoutes = {
  getAllPaginated: `${locationBase}/get-all-paginated`,
  getAll: `${locationBase}/get-all`,
  getById: (id: string) => `${locationBase}/get/${id}`,
  create: `${locationBase}/create`,
  update: (id: string) => `${locationBase}/update/${id}`,
  delete: (id: string) => `${locationBase}/delete/${id}`
};

export default LocationRoutes;
