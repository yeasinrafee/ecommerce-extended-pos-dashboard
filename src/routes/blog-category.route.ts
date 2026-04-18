const catBase = '/blog-categories';

export const BlogCategoryRoutes = {
  getAllPaginated: `${catBase}/get-all-paginated`,
  getAll: `${catBase}/get-all`,
  getById: (id: string) => `${catBase}/get/${id}`,
  create: `${catBase}/create`,
  update: (id: string) => `${catBase}/update/${id}`,
  delete: (id: string) => `${catBase}/delete/${id}`
};

export default BlogCategoryRoutes;
