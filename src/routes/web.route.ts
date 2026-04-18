const webBase = '/web';

export const WebRoutes = {
  // Company Information (formerly Web)
  companyInformation: {
    get: `${webBase}/company-information/get`,
    create: `${webBase}/company-information/create`,
    update: `${webBase}/company-information/update`,
    delete: `${webBase}/company-information/delete`,
  },

  // Company Policy (formerly Company Information)
  companyPolicy: {
    get: `${webBase}/company-policy/get`,
    create: `${webBase}/company-policy/create`,
    update: `${webBase}/company-policy/update`,
    delete: `${webBase}/company-policy/delete`,
  },

  // FAQ
  faq: {
    getAll: `${webBase}/faq/get-all`,
    getById: (id: string) => `${webBase}/faq/get/${id}`,
    create: `${webBase}/faq/create`,
    update: (id: string) => `${webBase}/faq/update/${id}`,
    delete: (id: string) => `${webBase}/faq/delete/${id}`,
  },

  // Social Media
  socialMedia: {
    getAll: `${webBase}/social-media/get-all`,
    getById: (id: string) => `${webBase}/social-media/get/${id}`,
    create: `${webBase}/social-media/create`,
    update: (id: string) => `${webBase}/social-media/update/${id}`,
    deleteMany: `${webBase}/social-media/delete`,
    delete: (id: string) => `${webBase}/social-media/delete/${id}`,
  },

  // Slider
  slider: {
    getAll: `${webBase}/slider/get-all`,
    getById: (id: string) => `${webBase}/slider/get/${id}`,
    create: `${webBase}/slider/create`,
    reorder: `${webBase}/slider/reorder`,
    update: (id: string) => `${webBase}/slider/update/${id}`,
    delete: (id: string) => `${webBase}/slider/delete/${id}`,
  },

  // Testimonial
  testimonial: {
    getAll: `${webBase}/testimonial/get-all`,
    getById: (id: string) => `${webBase}/testimonial/get/${id}`,
    create: `${webBase}/testimonial/create`,
    update: (id: string) => `${webBase}/testimonial/update/${id}`,
    delete: (id: string) => `${webBase}/testimonial/delete/${id}`,
  },
};

export default WebRoutes;
