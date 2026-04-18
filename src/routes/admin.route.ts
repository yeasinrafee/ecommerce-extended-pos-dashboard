const adminBase = '/admins';

export const AdminRoutes = {
  getProfile: `${adminBase}/profile`,
  updateProfile: `${adminBase}/profile/update`,
  getAllPaginated: `${adminBase}/get-all-paginated`,
  getAll: `${adminBase}/get-all`,
  getById: (id: string) => `${adminBase}/get/${id}`,
  update: (id: string) => `${adminBase}/update/${id}`,
  updateStatusBulk: `${adminBase}/update-status`,
  delete: (id: string) => `${adminBase}/delete/${id}`
};

export default AdminRoutes;
