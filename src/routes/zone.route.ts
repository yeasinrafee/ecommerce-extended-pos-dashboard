const zoneBase = '/zones';

export const ZoneRoutes = {
  getAllPaginated: `${zoneBase}/get-all-paginated`,
  getAvailable: `${zoneBase}/get-available`,
  getAll: `${zoneBase}/get-all`,
  getById: (id: string) => `${zoneBase}/get/${id}`,
  create: `${zoneBase}/create`,
  update: (id: string) => `${zoneBase}/update/${id}`,
  delete: (id: string) => `${zoneBase}/delete/${id}`
};

export default ZoneRoutes;
