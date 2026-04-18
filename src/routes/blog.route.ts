const blogBase = '/blogs';

export const BlogRoutes = {
  getAllPaginated: `${blogBase}/get-all-paginated`,
  getAll: `${blogBase}/get-all`,
  getById: (id: string) => `${blogBase}/get-by-id/${id}`,
  create: `${blogBase}/create`,
  update: (id: string) => `${blogBase}/update/${id}`,
  delete: (id: string) => `${blogBase}/delete/${id}`
};

export default BlogRoutes;
