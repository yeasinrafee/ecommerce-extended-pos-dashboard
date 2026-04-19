export const BankRoutes = {
  getAll: "/banks/get-all",
  create: "/banks/create",
  update: (id: string) => `/banks/update/${id}`,
  delete: (id: string) => `/banks/delete/${id}`,
};
