"use client";

import * as React from "react";
import { X } from "lucide-react";

import CustomCheckbox from "../../FormFields/CustomCheckbox";
import CustomFileUpload, {
  CustomFileUploadFile,
} from "../../FormFields/CustomFileUpload";
import type { Category } from "@/hooks/product-category.api";
import type { Tag } from "@/hooks/product-tag.api";

export type UploadedImage = CustomFileUploadFile;

export type RightSectionData = {
  mainImage: UploadedImage | null;
  mainImageExistingUrl: string | null;
  galleryImages: UploadedImage[];
  existingGalleryUrls: string[];
  categories: string[];
  tags: string[];
};

interface RightSectionProps {
  categoriesList: Category[];
  tagList: Tag[];
  onChange?: (data: RightSectionData) => void;
  // Edit-mode seed values
  initialMainImageUrl?: string | null;
  initialGalleryUrls?: string[];
  initialCategories?: string[];
  initialTags?: string[];
}

const RightSection: React.FC<RightSectionProps> = ({
  categoriesList,
  tagList,
  onChange,
  initialMainImageUrl,
  initialGalleryUrls,
  initialCategories,
  initialTags,
}) => {
  const [mainImage, setMainImage] = React.useState<UploadedImage | null>(null);
  const [mainImageExistingUrl, setMainImageExistingUrl] = React.useState<string | null>(null);
  const [galleryImages, setGalleryImages] = React.useState<UploadedImage[]>([]);
  const [existingGalleryUrls, setExistingGalleryUrls] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);

  // Seed state once when initial edit-mode values arrive
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    const hasSeeds = initialMainImageUrl || (initialGalleryUrls?.length ?? 0) > 0 || (initialCategories?.length ?? 0) > 0 || (initialTags?.length ?? 0) > 0;
    if (!initializedRef.current && hasSeeds) {
      initializedRef.current = true;
      if (initialMainImageUrl) setMainImageExistingUrl(initialMainImageUrl);
      if (initialGalleryUrls) setExistingGalleryUrls(initialGalleryUrls);
      if (initialCategories) setCategories(initialCategories);
      if (initialTags) setTags(initialTags);
    }
  }, [initialMainImageUrl, initialGalleryUrls, initialCategories, initialTags]);

  const toggleCategory = (categoryId: string) => {
    setCategories((prev) => {
      const isSelected = prev.includes(categoryId);
      const category = categoriesList.find((c) => c.id === categoryId);
      if (!category) {
        return isSelected ? prev.filter((item) => item !== categoryId) : [...prev, categoryId];
      }

      if (isSelected) {
        // Only remove the clicked category — do not affect parent/children
        return prev.filter((item) => item !== categoryId);
      }

      if (category.parentId) {
        return prev.includes(category.parentId) ? [...prev, categoryId] : [...prev, category.parentId, categoryId];
      }

      return [...prev, categoryId];
    });
  };

  const toggleTag = (tagId: string) => {
    setTags((prev) => (prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId]));
  };

  const mapUploads = (items: CustomFileUploadFile[]) =>
    items.map((file) => ({ ...file }));

  const handleMainFilesChange = React.useCallback(
    (uploaded: CustomFileUploadFile[]) => {
      const [first] = uploaded;
      setMainImage(first ? { ...first } : null);
    },
    [],
  );

  const handleGalleryFilesChange = React.useCallback(
    (uploaded: CustomFileUploadFile[]) => {
      setGalleryImages(mapUploads(uploaded));
    },
    [],
  );

  React.useEffect(() => {
    if (onChange) {
      onChange({ mainImage, mainImageExistingUrl, galleryImages, existingGalleryUrls, categories, tags });
    }
  }, [mainImage, mainImageExistingUrl, galleryImages, existingGalleryUrls, categories, tags, onChange]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-background px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Images</h2>
            <p className="text-sm text-slate-500">
              Upload one hero image plus up to 10 gallery shots.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Product image
              <span className="ml-1 text-destructive">*</span>
            </label>
            {/* Existing main image preview in edit mode */}
            {mainImageExistingUrl && !mainImage && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Current image (will be kept)</p>
                <div className="relative inline-block">
                  <img src={mainImageExistingUrl} alt="Current product" className="h-24 w-24 object-cover rounded-md border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setMainImageExistingUrl(null)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                    title="Remove and upload a new image"
                  >
                    <X size={10} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Click × to replace with a new upload.</p>
              </div>
            )}
            {/* Only show upload when no existing image is being kept */}
            {!mainImageExistingUrl && (
              <div className="mt-2">
                <CustomFileUpload
                  label=""
                  description="This hero image represents the product across listings."
                  helperText="Formats: PNG, JPG, JPEG, WEBP. Maximum 5MB."
                  maxFiles={1}
                  onFilesChange={handleMainFilesChange}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Gallery images</label>
            {/* Existing gallery thumbnails in edit mode */}
            {existingGalleryUrls.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Existing gallery (click × to remove)</p>
                <div className="flex flex-wrap gap-2">
                  {existingGalleryUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt={`Gallery ${idx + 1}`} className="h-14 w-14 object-cover rounded-md border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => setExistingGalleryUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                        title="Remove from gallery"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-2">
              <CustomFileUpload
                label=""
                description="Supplement the hero shot with contextual photos."
                helperText="Up to 10 new images. JPG, PNG, or WEBP."
                maxFiles={10}
                onFilesChange={handleGalleryFilesChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-background px-4 py-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Categories
          <span className="ml-1 text-destructive">*</span>
        </h3>
        <div className="mt-4 space-y-3 max-h-65 overflow-y-auto pr-2">
          {categoriesList
            .filter((c) => !c.parentId)
            .map((parent) => (
              <div key={parent.id}>
                <CustomCheckbox
                  key={parent.id}
                  label={parent.name}
                  checked={categories.includes(parent.id)}
                  onCheckedChange={() => toggleCategory(parent.id)}
                />
                <div className="ml-4 mt-2 space-y-2">
                  {categoriesList
                    .filter((c) => c.parentId === parent.id)
                    .map((child) => (
                      <CustomCheckbox
                        key={child.id}
                        label={child.name}
                        checked={categories.includes(child.id)}
                        onCheckedChange={() => toggleCategory(child.id)}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-background px-4 py-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Product Tags
        </h3>
        <div className="mt-4 space-y-3 max-h-65 overflow-y-auto pr-2">
          {tagList.map((tag) => (
            <CustomCheckbox
              key={tag.id}
              label={tag.name}
              checked={tags.includes(tag.id)}
              onCheckedChange={() => toggleTag(tag.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSection;