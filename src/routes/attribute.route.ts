const attributeBase = '/attributes';

export const AttributeRoutes = {
  getAllPaginated: `${attributeBase}/get-all-paginated`,
  getAll: `${attributeBase}/get-all`,
  getById: (id: string) => `${attributeBase}/get/${id}`,
  create: `${attributeBase}/create`,
  update: (id: string) => `${attributeBase}/update/${id}`,
  delete: (id: string) => `${attributeBase}/delete/${id}`
};

export default AttributeRoutes;
