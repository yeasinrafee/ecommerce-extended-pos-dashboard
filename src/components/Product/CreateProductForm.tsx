"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import CustomButton from "../Common/CustomButton";
import CustomTab, { CustomTabItem } from "../Common/CustomTab";
import MainInformation from "./ProductForm/MainInformation";
import GeneralInformation from "./ProductForm/GeneralInformation";
import Attributes, {
  AttributesData,
  AttributeRecord,
  AdditionalInfo as AdditionalInfoType,
} from "./ProductForm/Attributes";
import AdditionalInfo from "./ProductForm/AdditionalInfo";
import Seo, { SeoData } from "./ProductForm/Seo";
import RightSection, { RightSectionData } from "./ProductForm/RightSection";
import { useAllCategories } from "@/hooks/product-category.api";
import { useAllTags } from "@/hooks/product-tag.api";
import { useAllBrands, Brand } from "@/hooks/brand.api";
import { useCreateProduct, useUpdateProduct, useGetProduct } from "@/hooks/product.api";

const discountOptions = [
  { label: "None", value: "NONE" },
  { label: "Flat Discount", value: "FLAT_DISCOUNT" },
  { label: "Percentage Discount", value: "PERCENTAGE_DISCOUNT" },
];

const stockStatusOptions = [
  { label: "In Stock", value: "IN_STOCK" },
  { label: "Low Stock", value: "LOW_STOCK" },
  { label: "Out of Stock", value: "OUT_OF_STOCK" },
];

const productStatusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return value;
  }
  return Number(value);
};

const nullableNumberSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return Number(value);
}, z.number().nullable());

const nullablePositiveNumberSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return Number(value);
}, z.number().positive().nullable());

const nullableStringSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return String(value).trim();
}, z.string().nullable());

const nullableDateStringSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return String(value);
}, z.string().nullable());

const createProductSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required"),
    shortDescription: nullableStringSchema,
    description: z.string().trim().min(1, "Description is required"),
    basePrice: z.preprocess(toNumber, z.number().positive()),
    discountType: z.enum(["NONE", "FLAT_DISCOUNT", "PERCENTAGE_DISCOUNT"]),
    discountValue: nullableNumberSchema,
    discountStartDate: nullableDateStringSchema,
    discountEndDate: nullableDateStringSchema,
    stock: z.preprocess(toNumber, z.number().int().positive()),
    sku: nullableStringSchema,
    weight: nullablePositiveNumberSchema,
    length: nullablePositiveNumberSchema,
    width: nullablePositiveNumberSchema,
    height: nullablePositiveNumberSchema,
    brand: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return String(value).trim();
    }, z.string().optional()),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    stockStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]),
    categories: z
      .array(z.string().trim().min(1))
      .min(1, "At least one category is required"),
    tags: z.array(z.string().trim().min(1)),
    galleryImagesMeta: z.array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
      }),
    ),
    attributes: z.array(
      z.object({
        name: z.string().trim().min(1),
        pairs: z
          .array(
            z.object({
              value: z.string().trim().min(1),
              price: z.string().optional(),
              imageId: z.string().trim().optional().nullable(),
            }),
          )
          .min(1),
      }),
    ),
    additionalInfo: z.array(
      z.object({
        name: z.string().trim().min(1),
        value: z.string().trim().min(1),
      }),
    ),
    seo: z
      .object({
        metaTitle: z.string(),
        metaDescription: z.string(),
        seoKeywords: z.array(z.string().trim().min(1)),
      })
      .nullable(),
  })
  .superRefine((data, ctx) => {
    const hasWeight = data.weight != null;
    const hasDimensions =
      data.length != null && data.width != null && data.height != null;

    if (!hasWeight && !hasDimensions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weight"],
        message: "Provide weight or all three dimensions",
      });
    }

    const needsDiscountValue = data.discountType !== "NONE";
    if (
      needsDiscountValue &&
      (data.discountValue == null || Number.isNaN(data.discountValue))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Discount value is required when a discount type is selected",
      });
    }

    if (data.discountStartDate && data.discountEndDate) {
      const start = new Date(data.discountStartDate);
      const end = new Date(data.discountEndDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountEndDate"],
          message: "Discount end date must be after the start date",
        });
      }
    }

    const seoProvided = Boolean(
      data.seo &&
      (data.seo.metaTitle ||
        data.seo.metaDescription ||
        data.seo.seoKeywords.length > 0),
    );

    if (seoProvided && !data.seo?.metaTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seo", "metaTitle"],
        message: "SEO meta title is required when SEO data is provided",
      });
    }
  });

const defaultFormValues: z.infer<typeof createProductSchema> = {
  name: "",
  shortDescription: null,
  description: "",
  basePrice: 0,
  discountType: "NONE",
  discountValue: null,
  discountStartDate: null,
  discountEndDate: null,
  stock: 0,
  sku: null,
  weight: null,
  length: null,
  width: null,
  height: null,
  brand: "",
  status: "ACTIVE",
  stockStatus: "IN_STOCK",
  categories: [],
  tags: [],
  galleryImagesMeta: [],
  attributes: [],
  additionalInfo: [],
  seo: null,
};

const initialRightSectionState: RightSectionData = {
  mainImage: null,
  mainImageExistingUrl: null,
  galleryImages: [],
  existingGalleryUrls: [],
  categories: [],
  tags: [],
};

const initialAttributesState: AttributesData = {
  attributes: [],
  additionalInfo: [],
};

const initialSeoState: SeoData = {
  metaTitle: "",
  metaDescription: "",
  seoKeywords: [],
};

const normalizeStringArray = (items: string[]) => [...new Set(items)].sort();

const isSameStringArray = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

export default function CreateProductForm({ productId }: { productId?: string }) {
  const isEditMode = !!productId;
  const router = useRouter();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const { mutate: createProduct } = createProductMutation;
  const { mutate: updateProduct } = updateProductMutation;

  // Load existing product in edit mode
  const { data: productData, isLoading: productLoading } = useGetProduct(productId ?? "");

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isValid, isSubmitting, isDirty },
  } = useForm<z.infer<typeof createProductSchema>>({
    resolver: zodResolver(createProductSchema) as Resolver<
      z.infer<typeof createProductSchema>
    >,
    mode: "onChange",
    defaultValues: defaultFormValues,
  });

  const [productName, setProductName] = React.useState("");
  const [shortDescription, setShortDescription] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [basePrice, setBasePrice] = React.useState<number | null>(null);
  const [discountValue, setDiscountValue] = React.useState<number | null>(null);
  const [discountStart, setDiscountStart] = React.useState<Date | null>(null);
  const [discountEnd, setDiscountEnd] = React.useState<Date | null>(null);
  const [stockQuantity, setStockQuantity] = React.useState<number | null>(null);
  const [sku, setSku] = React.useState("");
  const [weight, setWeight] = React.useState<number | null>(null);
  const [lengthCm, setLengthCm] = React.useState<number | null>(null);
  const [widthCm, setWidthCm] = React.useState<number | null>(null);
  const [heightCm, setHeightCm] = React.useState<number | null>(null);

  const [rightData, setRightData] = React.useState(initialRightSectionState);
  const [rightSectionReady, setRightSectionReady] = React.useState(false);
  const [rightResetKey, setRightResetKey] = React.useState(0);
  const [attributesData, setAttributesData] = React.useState(
    initialAttributesState,
  );
  const [attributesResetKey, setAttributesResetKey] = React.useState(0);
  const [additionalResetKey, setAdditionalResetKey] = React.useState(0);
  const [seoResetKey, setSeoResetKey] = React.useState(0);
  const [seoData, setSeoData] = React.useState<SeoData>(initialSeoState);
  const [isEditorProcessing, setIsEditorProcessing] = React.useState(false);

  const selectedDiscountType = watch("discountType");
  const stockStatusValue = watch("stockStatus");
  const productStatusValue = watch("status");

  const { data: productCategories } = useAllCategories();
  const { data: productTags } = useAllTags();
  const { data: allBrands } = useAllBrands();

  const brandOptions = React.useMemo(
    () =>
      (allBrands ?? []).map((brand: Brand) => ({
        label: brand.name,
        value: brand.id,
      })),
    [allBrands],
  );

  const categoriesList = React.useMemo(
    () => productCategories ?? [],
    [productCategories],
  );
  const tagList = React.useMemo(() => productTags ?? [], [productTags]);

  // ── Edit-mode: pre-fill all fields when productData arrives ─────────────────
  const editPrefillDoneRef = React.useRef(false);
  React.useEffect(() => {
    if (!isEditMode || !productData || editPrefillDoneRef.current) return;
    editPrefillDoneRef.current = true;
    setRightSectionReady(false);

    const p = productData as any;

    // Local state
    setProductName(p.name ?? "");
    setShortDescription(p.shortDescription ?? "");
    setDescription(p.description ?? "");
    setBasePrice(p.Baseprice ?? null);
    setDiscountValue(p.discountValue ?? null);
    setDiscountStart(p.discountStartDate ? new Date(p.discountStartDate) : null);
    setDiscountEnd(p.discountEndDate ? new Date(p.discountEndDate) : null);
    setStockQuantity(p.stock ?? null);
    setSku(p.sku ?? "");
    setWeight(p.weight ?? null);
    setLengthCm(p.length ?? null);
    setWidthCm(p.width ?? null);
    setHeightCm(p.height ?? null);

    // SEO
    const seo = p.seos?.[0];
    if (seo) {
      setSeoData({ metaTitle: seo.title ?? "", metaDescription: seo.description ?? "", seoKeywords: seo.keyword ?? [] });
    }

    // form values
    reset({
      name: p.name ?? "",
      shortDescription: p.shortDescription ?? null,
      description: p.description ?? "",
      basePrice: p.Baseprice ?? 0,
      discountType: p.discountType ?? "NONE",
      discountValue: p.discountValue ?? null,
      discountStartDate: p.discountStartDate ?? null,
      discountEndDate: p.discountEndDate ?? null,
      stock: p.stock ?? 0,
      sku: p.sku ?? null,
      weight: p.weight ?? null,
      length: p.length ?? null,
      width: p.width ?? null,
      height: p.height ?? null,
      brand: p.brandId ?? "",
      status: p.status ?? "ACTIVE",
      stockStatus: p.stockStatus ?? "IN_STOCK",
      categories: (p.categories ?? []).map((c: any) => c.categoryId),
      tags: (p.tags ?? []).map((t: any) => t.tagId),
      galleryImagesMeta: [],
      attributes: [],
      additionalInfo: (p.additionalInformations ?? []).map((i: any) => ({ name: i.name, value: i.value })),
      seo: seo ? { metaTitle: seo.title ?? "", metaDescription: seo.description ?? "", seoKeywords: seo.keyword ?? [] } : null,
    });
  }, [isEditMode, productData, reset]);

  // ── Merged gallery list: existing (kept) + new uploads — fed to Attributes ──
  const allGalleryForAttributes = React.useMemo(() => {
    const existing = rightData.existingGalleryUrls.map((url) => ({
      id: `__existing__${url}`,
      name: url.split("/").pop()?.split(".")[0] ?? "gallery",
      url,
    }));
    const fresh = rightData.galleryImages.map((img) => ({
      id: img.id,
      name: img.name,
      url: img.url,
    }));
    return [...existing, ...fresh];
  }, [rightData.existingGalleryUrls, rightData.galleryImages]);

  // ── Initial attributes derived from existing product variations ─────────────
  const initialAttributes = React.useMemo<AttributeRecord[] | undefined>(() => {
    if (!productData) return undefined;
    const p = productData as any;
    if (!p.productVariations?.length) return undefined;

    const grouped = new Map<string, AttributeRecord>();
    for (const v of p.productVariations) {
      const attrName = v.attribute?.name ?? "";
      if (!attrName) continue;
      if (!grouped.has(attrName)) grouped.set(attrName, { name: attrName, pairs: [] });
      grouped.get(attrName)!.pairs.push({
        value: v.attributeValue ?? "",
        price: v.basePrice != null ? String(v.basePrice) : "",
        imageId: v.galleryImage ? `__existing__${v.galleryImage}` : null,
        existingImageUrl: v.galleryImage ?? null,
      });
    }
    return Array.from(grouped.values());
  }, [productData]);

  // ── Initial additional info ──────────────────────────────────────────────────
  const initialAdditionalInfo = React.useMemo<AdditionalInfoType[] | undefined>(() => {
    if (!productData) return undefined;
    const p = productData as any;
    return p.additionalInformations?.map((i: any) => ({ name: i.name, value: i.value }));
  }, [productData]);

  // ── Initial SEO data ─────────────────────────────────────────────────────────
  const initialSeoForForm = React.useMemo<SeoData | undefined>(() => {
    if (!productData) return undefined;
    const seo = (productData as any).seos?.[0];
    if (!seo) return undefined;
    return { metaTitle: seo.title ?? "", metaDescription: seo.description ?? "", seoKeywords: seo.keyword ?? [] };
  }, [productData]);

  const updateMainInformation = (value: string) => {
    setProductName(value);
    setValue("name", value, { shouldValidate: true, shouldDirty: true });
  };

  const updateShortDescription = (value: string) => {
    setShortDescription(value);
    setValue("shortDescription", value.trim() === "" ? null : value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateDescription = (value: string) => {
    setDescription(value);
    setValue("description", value, { shouldValidate: true, shouldDirty: true });
  };

  const updateBasePrice = (value: number | null) => {
    setBasePrice(value);
    setValue("basePrice", value ?? 0, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateDiscountValue = (value: number | null) => {
    setDiscountValue(value);
    setValue("discountValue", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateDiscountStart = (value: Date | null) => {
    setDiscountStart(value);
    setValue("discountStartDate", value ? value.toISOString() : null, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateDiscountEnd = (value: Date | null) => {
    setDiscountEnd(value);
    setValue("discountEndDate", value ? value.toISOString() : null, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateStockQuantity = (value: number | null) => {
    setStockQuantity(value);
    setValue("stock", value ?? 0, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateSku = (value: string) => {
    setSku(value);
    setValue("sku", value.trim() === "" ? null : value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateWeight = (value: number | null) => {
    setWeight(value);
    setValue("weight", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateLength = (value: number | null) => {
    setLengthCm(value);
    setValue("length", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateWidth = (value: number | null) => {
    setWidthCm(value);
    setValue("width", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const updateHeight = (value: number | null) => {
    setHeightCm(value);
    setValue("height", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRightSectionChange = React.useCallback(
    (data: RightSectionData) => {
      setRightSectionReady(true);
      setRightData(data);
      const galleryMeta = data.galleryImages.map((image) => ({
        id: image.id,
        name: image.name,
      }));
      setValue("categories", data.categories, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue("tags", data.tags, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue("galleryImagesMeta", galleryMeta, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue],
  );

  React.useEffect(() => {
    setValue("attributes", attributesData.attributes, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [attributesData.attributes, setValue]);

  React.useEffect(() => {
    setValue("additionalInfo", attributesData.additionalInfo, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [attributesData.additionalInfo, setValue]);

  React.useEffect(() => {
    const hasSeoData = Boolean(
      seoData.metaTitle ||
      seoData.metaDescription ||
      seoData.seoKeywords.length > 0,
    );
    setValue("seo", hasSeoData ? seoData : null, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [seoData, setValue]);

  const [attributesPending, setAttributesPending] = React.useState<{ name?: string; value?: string } | null>(null);

  const handleAttributesChange = React.useCallback((data: AttributesData, pending?: { name?: string; value?: string } | null) => {
    setAttributesData((prev) => ({ ...prev, attributes: data.attributes }));
    setAttributesPending(pending ?? null);
  }, []);

  const handleAdditionalInfoChange = React.useCallback(
    (info: AdditionalInfoType[]) => {
      setAttributesData((prev) => ({ ...prev, additionalInfo: info }));
    },
    [],
  );

  const rightGalleryPreview = React.useMemo(
    () => allGalleryForAttributes,
    [allGalleryForAttributes],
  );

  const initialMainImageUrl = React.useMemo(
    () => (isEditMode ? ((productData as any)?.image ?? null) : null),
    [isEditMode, productData],
  );

  const initialGalleryUrls = React.useMemo(
    () => normalizeStringArray((((productData as any)?.galleryImages ?? []) as string[])),
    [productData],
  );

  const currentMainImageExistingUrl = rightSectionReady
    ? rightData.mainImageExistingUrl
    : initialMainImageUrl;

  const currentGalleryUrls = React.useMemo(
    () =>
      normalizeStringArray(
        ((rightSectionReady
          ? rightData.existingGalleryUrls
          : ((productData as any)?.galleryImages ?? [])) as string[]),
      ),
    [rightSectionReady, rightData.existingGalleryUrls, productData],
  );

  const hasMediaChanges =
    isEditMode &&
    (Boolean(rightData.mainImage) ||
      rightData.galleryImages.length > 0 ||
      currentMainImageExistingUrl !== initialMainImageUrl ||
      !isSameStringArray(currentGalleryUrls, initialGalleryUrls));

  const hasActualChanges = !isEditMode || isDirty || hasMediaChanges;

  const mutationPending = Boolean(
    (createProductMutation as any).isPending ||
    (createProductMutation as any).isLoading ||
    (updateProductMutation as any).isPending ||
    (updateProductMutation as any).isLoading,
  );

  // In edit mode, existing main image counts as having a main image
  const hasMainImage = !!rightData.mainImage || !!currentMainImageExistingUrl;
  const submitDisabled =
    !isValid ||
    !hasMainImage ||
    !hasActualChanges ||
    mutationPending ||
    isSubmitting ||
    isEditorProcessing;

  const normalizeAttributesForSubmit = () =>
    attributesData.attributes.map((attribute) => ({
      name: attribute.name.trim(),
      pairs: attribute.pairs.map((pair) => {
        const trimmedPrice = String(pair.price ?? "").trim();
        const rawImageId = pair.imageId ?? null;
        let imageId: string | null = null;
        let existingImageUrl: string | null = null;
        if (rawImageId?.startsWith("__existing__")) {
          existingImageUrl = rawImageId.slice("__existing__".length);
        } else {
          imageId = rawImageId;
        }
        return {
          value: pair.value.trim(),
          price: trimmedPrice === "" ? null : Number(trimmedPrice),
          imageId,
          existingImageUrl,
        };
      }),
    }));

  const normalizeAdditionalInfoForSubmit = () =>
    attributesData.additionalInfo.map((info) => ({
      name: info.name.trim(),
      value: info.value.trim(),
    }));

  function buildCreateFormData(values: z.infer<typeof createProductSchema>) {
    const payload = new FormData();
    payload.append("name", values.name);
    payload.append("shortDescription", values.shortDescription ?? "");
    payload.append("description", values.description);
    payload.append("basePrice", String(values.basePrice));
    payload.append("discountType", values.discountType);
    payload.append("discountValue", values.discountValue == null ? "" : String(values.discountValue));
    payload.append("discountStartDate", values.discountStartDate ?? "");
    payload.append("discountEndDate", values.discountEndDate ?? "");
    payload.append("stock", String(values.stock));
    payload.append("sku", values.sku ?? "");
    payload.append("weight", values.weight == null ? "" : String(values.weight));
    payload.append("length", values.length == null ? "" : String(values.length));
    payload.append("width", values.width == null ? "" : String(values.width));
    payload.append("height", values.height == null ? "" : String(values.height));
    if (values.brand) payload.append("brandId", values.brand);
    payload.append("status", values.status);
    payload.append("stockStatus", values.stockStatus);
    payload.append("categories", JSON.stringify(values.categories));
    payload.append("tags", JSON.stringify(values.tags));

    const galleryMeta = rightData.galleryImages.map((image) => ({ id: image.id, name: image.name }));
    payload.append("galleryImagesMeta", JSON.stringify(galleryMeta));
    payload.append("attributes", JSON.stringify(normalizeAttributesForSubmit()));
    payload.append("additionalInfo", JSON.stringify(normalizeAdditionalInfoForSubmit()));

    const hasSeoData = Boolean(seoData.metaTitle || seoData.metaDescription || seoData.seoKeywords.length > 0);
    payload.append("seo", JSON.stringify(hasSeoData ? seoData : null));

    payload.append("mainImage", rightData.mainImage!.file);
    rightData.galleryImages.forEach((image) => payload.append("galleryImages", image.file));

    return payload;
  }

  function buildUpdateFormData(values: z.infer<typeof createProductSchema>) {
    const payload = new FormData();
    payload.append("name", values.name);
    payload.append("shortDescription", values.shortDescription ?? "");
    payload.append("description", values.description);
    payload.append("basePrice", String(values.basePrice));
    payload.append("discountType", values.discountType);
    payload.append("discountValue", values.discountValue == null ? "" : String(values.discountValue));
    payload.append("discountStartDate", values.discountStartDate ?? "");
    payload.append("discountEndDate", values.discountEndDate ?? "");
    payload.append("stock", String(values.stock));
    payload.append("sku", values.sku ?? "");
    payload.append("weight", values.weight == null ? "" : String(values.weight));
    payload.append("length", values.length == null ? "" : String(values.length));
    payload.append("width", values.width == null ? "" : String(values.width));
    payload.append("height", values.height == null ? "" : String(values.height));
    if (values.brand) payload.append("brandId", values.brand);
    payload.append("status", values.status);
    payload.append("stockStatus", values.stockStatus);
    payload.append("categories", JSON.stringify(values.categories));
    payload.append("tags", JSON.stringify(values.tags));

    // Main image handling
    const keepMainImage = !rightData.mainImage && !!rightData.mainImageExistingUrl;
    payload.append("keepMainImage", keepMainImage ? "true" : "false");
    if (!keepMainImage && rightData.mainImage) {
      payload.append("mainImage", rightData.mainImage.file);
    }

    // Gallery handling: kept existing + new uploads
    payload.append("existingGalleryUrls", JSON.stringify(rightData.existingGalleryUrls));
    const newGalleryMeta = rightData.galleryImages.map((image) => ({ id: image.id, name: image.name }));
    payload.append("galleryImagesMeta", JSON.stringify(newGalleryMeta));
    rightData.galleryImages.forEach((image) => payload.append("galleryImages", image.file));

    payload.append("attributes", JSON.stringify(normalizeAttributesForSubmit()));
    payload.append("additionalInfo", JSON.stringify(normalizeAdditionalInfoForSubmit()));

    const hasSeoData = Boolean(seoData.metaTitle || seoData.metaDescription || seoData.seoKeywords.length > 0);
    payload.append("seo", JSON.stringify(hasSeoData ? seoData : null));

    return payload;
  }

  const handleSuccess = () => {
    router.push("/dashboard/product/manage");
    reset(defaultFormValues);
    setProductName("");
    setShortDescription("");
    setDescription("");
    setBasePrice(null);
    setDiscountValue(null);
    setDiscountStart(null);
    setDiscountEnd(null);
    setStockQuantity(null);
    setSku("");
    setWeight(null);
    setLengthCm(null);
    setWidthCm(null);
    setHeightCm(null);
    setRightData(initialRightSectionState);
    setRightResetKey((prev) => prev + 1);
    setAttributesData(initialAttributesState);
    setAttributesResetKey((prev) => prev + 1);
    setAdditionalResetKey((prev) => prev + 1);
    setSeoData(initialSeoState);
    setSeoResetKey((prev) => prev + 1);
    setValue("categories", [], { shouldValidate: true, shouldDirty: true });
    setValue("tags", [], { shouldValidate: true, shouldDirty: true });
    setValue("galleryImagesMeta", [], { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (values: z.infer<typeof createProductSchema>) => {
    if (!hasMainImage) {
      toast.error("Main image is required");
      return;
    }

    if (attributesPending && attributesPending.name && (!attributesPending.value || attributesPending.value.trim() === "")) {
      toast.error(`Please select a value for attribute "${attributesPending.name}"`);
      return;
    }

    if (isEditMode && productId) {
      const payload = buildUpdateFormData(values);
      updateProduct({ id: productId, payload }, { onSuccess: handleSuccess });
    } else {
      const payload = buildCreateFormData(values);
      createProduct(payload, { onSuccess: handleSuccess });
    }
  };

  const tabItems: CustomTabItem[] = [
    {
      id: "general",
      label: "General",
      content: (
        <GeneralInformation
          basePrice={basePrice}
          setBasePrice={updateBasePrice}
          selectedDiscountType={selectedDiscountType}
          discountValue={discountValue}
          setDiscountValue={updateDiscountValue}
          discountStart={discountStart}
          setDiscountStart={updateDiscountStart}
          discountEnd={discountEnd}
          setDiscountEnd={updateDiscountEnd}
          stockQuantity={stockQuantity}
          setStockQuantity={updateStockQuantity}
          sku={sku}
          setSku={updateSku}
          weight={weight}
          setWeight={updateWeight}
          lengthCm={lengthCm}
          setLengthCm={updateLength}
          widthCm={widthCm}
          setWidthCm={updateWidth}
          heightCm={heightCm}
          setHeightCm={updateHeight}
          control={control}
          discountOptions={discountOptions}
          stockStatusOptions={stockStatusOptions}
          productStatusOptions={productStatusOptions}
        />
      ),
    },
    {
      id: "attributes",
      label: "Attributes",
      content: (
        <Attributes
          key={attributesResetKey}
          galleryImages={rightGalleryPreview}
          onChange={handleAttributesChange}
          initialAttributes={
            attributesData.attributes && attributesData.attributes.length > 0
              ? attributesData.attributes
              : initialAttributes
          }
        />
      ),
    },
    {
      id: "additional",
      label: "Additional Info",
      content: (
        <AdditionalInfo
          key={additionalResetKey}
          onChange={handleAdditionalInfoChange}
          initialInfo={
            attributesData.additionalInfo && attributesData.additionalInfo.length > 0
              ? attributesData.additionalInfo
              : initialAdditionalInfo
          }
        />
      ),
    },
    {
      id: "seo",
      label: "SEO",
      content: (
        <Seo
          key={seoResetKey}
          onChange={setSeoData}
          initialData={
            seoData && (seoData.metaTitle || seoData.metaDescription || seoData.seoKeywords.length > 0)
              ? seoData
              : initialSeoForForm
          }
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {isEditMode && productLoading && (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <span>Loading product data…</span>
        </div>
      )}
      {(!isEditMode || !productLoading) && (
      <>
      <div className="mx-auto w-full max-w-full grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="left-section space-y-6 col-span-6 lg:col-span-7">
          <MainInformation
            productName={productName}
            setProductName={updateMainInformation}
            shortDescription={shortDescription}
            setShortDescription={updateShortDescription}
            description={description}
            setDescription={updateDescription}
            brandOptions={brandOptions}
            control={control}
            isEditMode={isEditMode}
            onEditorProcessingChange={setIsEditorProcessing}
          />

          <div className="rounded-2xl border border-slate-200 bg-background px-6 py-6 shadow-sm">
            <CustomTab
              tabs={tabItems}
              className="space-y-4"
              tabListClassName="justify-start"
            />
          </div>
        </div>

        <div className="col-span-6 lg:col-span-5">
          <RightSection
            key={rightResetKey}
            categoriesList={categoriesList}
            tagList={tagList}
            onChange={handleRightSectionChange}
            initialMainImageUrl={isEditMode ? (productData as any)?.image : undefined}
            initialGalleryUrls={isEditMode ? ((productData as any)?.galleryImages ?? []) : undefined}
            initialCategories={isEditMode ? ((productData as any)?.categories ?? []).map((c: any) => c.categoryId) : undefined}
            initialTags={isEditMode ? ((productData as any)?.tags ?? []).map((t: any) => t.tagId) : undefined}
          />
        </div>
      </div>
      <div className="w-full flex justify-center py-10">
        <CustomButton
          type="button"
          className="px-4"
          onClick={handleSubmit(onSubmit)}
          disabled={submitDisabled}
          loading={mutationPending || isSubmitting}
        >
          {isEditMode ? "Update Product" : "Save Product"}
        </CustomButton>
      </div>
      </>
      )}
    </div>
  );
}
