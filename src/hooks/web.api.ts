import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { WebRoutes } from "@/routes/web.route";
import type { ApiResponse } from "@/types/auth";
import { toast } from "react-hot-toast";

export interface CompanyInformation {
  id: string;
  email?: string;
  address?: string;
  phone?: string;
  shortDescription?: string;
  workingHours?: string;
  logo?: string | null;
  footerLogo?: string | null;
}

export interface CompanyPolicy {
  id: string;
  termsOfService?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  refundPolicy?: string;
  shippingPolicy?: string;
  sizeChart?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface SocialMedia {
  id: string;
  name: string;
  link: string;
}

export interface Slider {
  id: string;
  image: string;
  link?: string | null;
  serial: number;
}

export interface Testimonial {
  id: string;
  name: string;
  designation: string;
  rating: number;
  comment: string;
  image?: string | null;
}

const ensurePayload = <T>(response: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

export const webKeys = {
  companyInfo: ["company-info"] as const,
  companyPolicy: ["company-policy"] as const,
  faq: ["faq"] as const,
  faqDetail: (id: string) => [...webKeys.faq, id] as const,
  socialMedia: ["social-media"] as const,
  socialMediaDetail: (id: string) => [...webKeys.socialMedia, id] as const,
  slider: ["slider"] as const,
  sliderDetail: (id: string) => [...webKeys.slider, id] as const,
  testimonial: ["testimonial"] as const,
  testimonialDetail: (id: string) => [...webKeys.testimonial, id] as const,
};

export const useCompanyInformation = () => {
  return useQuery<CompanyInformation>({
    queryKey: webKeys.companyInfo,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CompanyInformation>>(WebRoutes.companyInformation.get);
      return ensurePayload(response.data, "Failed to fetch company information");
    },
  });
};

export const useCreateCompanyInformation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CompanyInformation>) => {
      const response = await apiClient.post<ApiResponse<CompanyInformation>>(WebRoutes.companyInformation.create, payload);
      return ensurePayload(response.data, "Failed to create company information");
    },
    onSuccess: () => {
      toast.success("Company information created successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.companyInfo });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create company information");
    },
  });
};

export const useUpdateCompanyInformation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CompanyInformation>) => {
      const response = await apiClient.patch<ApiResponse<CompanyInformation>>(WebRoutes.companyInformation.update, payload);
      return ensurePayload(response.data, "Failed to update company information");
    },
    onSuccess: () => {
      toast.success("Company information updated successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.companyInfo });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update company information");
    },
  });
};

export const useCompanyPolicy = () => {
  return useQuery<CompanyPolicy>({
    queryKey: webKeys.companyPolicy,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CompanyPolicy>>(WebRoutes.companyPolicy.get);
      return ensurePayload(response.data, "Failed to fetch company policy");
    },
  });
};

export const useCreateCompanyPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CompanyPolicy>) => {
      const response = await apiClient.post<ApiResponse<CompanyPolicy>>(WebRoutes.companyPolicy.create, payload);
      return ensurePayload(response.data, "Failed to create company policy");
    },
    onSuccess: () => {
      toast.success("Company policy created successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.companyPolicy });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create company policy");
    },
  });
};

export const useUpdateCompanyPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CompanyPolicy>) => {
      const response = await apiClient.patch<ApiResponse<CompanyPolicy>>(WebRoutes.companyPolicy.update, payload);
      return ensurePayload(response.data, "Failed to update company policy");
    },
    onSuccess: () => {
      toast.success("Company policy updated successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.companyPolicy });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update company policy");
    },
  });
};

export const useAllFaqs = () => {
  return useQuery<FAQ[]>({
    queryKey: webKeys.faq,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<FAQ[]>>(WebRoutes.faq.getAll);
      return ensurePayload(response.data, "Failed to fetch FAQs");
    },
  });
};

export const useFaqById = (id: string) => {
  return useQuery<FAQ>({
    queryKey: webKeys.faqDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<FAQ>>(WebRoutes.faq.getById(id));
      return ensurePayload(response.data, "Failed to fetch FAQ");
    },
    enabled: !!id,
  });
};

export const useCreateFaq = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FAQ>) => {
      const response = await apiClient.post<ApiResponse<FAQ>>(WebRoutes.faq.create, payload);
      return ensurePayload(response.data, "Failed to create FAQ");
    },
    onSuccess: () => {
      toast.success("FAQ created successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.faq });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create FAQ");
    },
  });
};

export const useUpdateFaq = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<FAQ> }) => {
      const response = await apiClient.patch<ApiResponse<FAQ>>(WebRoutes.faq.update(id), payload);
      return ensurePayload(response.data, "Failed to update FAQ");
    },
    onSuccess: () => {
      toast.success("FAQ updated successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.faq });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update FAQ");
    },
  });
};

export const useDeleteFaq = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(WebRoutes.faq.delete(id));
      if (!response.data.success) throw new Error(response.data.message || "Failed to delete FAQ");
      return response.data;
    },
    onSuccess: () => {
      toast.success("FAQ deleted successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.faq });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete FAQ");
    },
  });
};

export const useAllSocialMedia = () => {
  return useQuery<SocialMedia[]>({
    queryKey: webKeys.socialMedia,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<SocialMedia[]>>(WebRoutes.socialMedia.getAll);
      return ensurePayload(response.data, "Failed to fetch social media links");
    },
  });
};

export const useSocialMediaById = (id: string) => {
  return useQuery<SocialMedia>({
    queryKey: webKeys.socialMediaDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<SocialMedia>>(WebRoutes.socialMedia.getById(id));
      return ensurePayload(response.data, "Failed to fetch social media link");
    },
    enabled: !!id,
  });
};

export const useCreateSocialMedia = ({ showToast = true }: { showToast?: boolean } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SocialMedia> | Partial<SocialMedia>[]) => {
      const response = await apiClient.post<ApiResponse<SocialMedia | SocialMedia[]>>(WebRoutes.socialMedia.create, payload);
      return ensurePayload(response.data, "Failed to create social media link");
    },
    onSuccess: () => {
      if (showToast) {
        toast.success("Social media link(s) created successfully");
      }
      queryClient.invalidateQueries({ queryKey: webKeys.socialMedia });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create social media link");
    },
  });
};

export const useUpdateSocialMedia = ({ showToast = true }: { showToast?: boolean } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Partial<SocialMedia> | Partial<SocialMedia>[] }) => {
      const response = await apiClient.patch<ApiResponse<SocialMedia | SocialMedia[]>>(id ? WebRoutes.socialMedia.update(id) : WebRoutes.socialMedia.create.replace("/create", "/update"), payload);
      return ensurePayload(response.data, "Failed to update social media link");
    },
    onSuccess: () => {
      if (showToast) {
        toast.success("Social media link(s) updated successfully");
      }
      queryClient.invalidateQueries({ queryKey: webKeys.socialMedia });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update social media link");
    },
  });
};

export const useDeleteSocialMedia = ({ showToast = true }: { showToast?: boolean } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (idOrIds: string | string[]) => {
      const isBatch = Array.isArray(idOrIds);
      const url = isBatch ? WebRoutes.socialMedia.deleteMany : WebRoutes.socialMedia.delete(idOrIds);
      const response = await apiClient.delete<ApiResponse<null>>(url, {
        data: isBatch ? { ids: idOrIds } : undefined,
      });
      if (!response.data.success) throw new Error(response.data.message || "Failed to delete social media link");
      return response.data;
    },
    onSuccess: () => {
      if (showToast) {
        toast.success("Social media link deleted successfully");
      }
      queryClient.invalidateQueries({ queryKey: webKeys.socialMedia });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete social media link");
    },
  });
};

export const useAllSliders = () => {
  return useQuery<Slider[]>({
    queryKey: webKeys.slider,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Slider[]>>(WebRoutes.slider.getAll);
      return ensurePayload(response.data, "Failed to fetch sliders");
    },
  });
};

export const useSliderById = (id: string) => {
  return useQuery<Slider>({
    queryKey: webKeys.sliderDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Slider>>(WebRoutes.slider.getById(id));
      return ensurePayload(response.data, "Failed to fetch slider");
    },
    enabled: !!id,
  });
};

export const useCreateSlider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await apiClient.post<ApiResponse<Slider>>(WebRoutes.slider.create, payload);
      return ensurePayload(response.data, "Failed to create slider");
    },
    onSuccess: () => {
      toast.success("Slider created successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.slider });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create slider");
    },
  });
};

export const useUpdateSlider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: FormData }) => {
      const response = await apiClient.patch<ApiResponse<Slider>>(WebRoutes.slider.update(id), payload);
      return ensurePayload(response.data, "Failed to update slider");
    },
    onSuccess: () => {
      toast.success("Slider updated successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.slider });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update slider");
    },
  });
};

export const useReorderSliders = ({ showToast = false }: { showToast?: boolean } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Array<{ id: string; serial: number }>) => {
      const response = await apiClient.patch<ApiResponse<Slider[]>>(WebRoutes.slider.reorder, payload);
      return ensurePayload(response.data, "Failed to reorder sliders");
    },
    onSuccess: () => {
      if (showToast) {
        toast.success("Slider order updated successfully");
      }
      queryClient.invalidateQueries({ queryKey: webKeys.slider });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to reorder sliders");
    },
  });
};

export const useDeleteSlider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(WebRoutes.slider.delete(id));
      if (!response.data.success) throw new Error(response.data.message || "Failed to delete slider");
      return response.data;
    },
    onSuccess: () => {
      toast.success("Slider deleted successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.slider });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete slider");
    },
  });
};

export const useAllTestimonials = () => {
  return useQuery<Testimonial[]>({
    queryKey: webKeys.testimonial,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Testimonial[]>>(WebRoutes.testimonial.getAll);
      return ensurePayload(response.data, "Failed to fetch testimonials");
    },
  });
};

export const useTestimonialById = (id: string) => {
  return useQuery<Testimonial>({
    queryKey: webKeys.testimonialDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Testimonial>>(WebRoutes.testimonial.getById(id));
      return ensurePayload(response.data, "Failed to fetch testimonial");
    },
    enabled: !!id,
  });
};

export const useCreateTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await apiClient.post<ApiResponse<Testimonial>>(WebRoutes.testimonial.create, payload);
      return ensurePayload(response.data, "Failed to create testimonial");
    },
    onSuccess: () => {
      toast.success("Testimonial created successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.testimonial });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create testimonial");
    },
  });
};

export const useUpdateTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: FormData }) => {
      const response = await apiClient.patch<ApiResponse<Testimonial>>(WebRoutes.testimonial.update(id), payload);
      return ensurePayload(response.data, "Failed to update testimonial");
    },
    onSuccess: () => {
      toast.success("Testimonial updated successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.testimonial });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update testimonial");
    },
  });
};

export const useDeleteTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(WebRoutes.testimonial.delete(id));
      if (!response.data.success) throw new Error(response.data.message || "Failed to delete testimonial");
      return response.data;
    },
    onSuccess: () => {
      toast.success("Testimonial deleted successfully");
      queryClient.invalidateQueries({ queryKey: webKeys.testimonial });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete testimonial");
    },
  });
};
