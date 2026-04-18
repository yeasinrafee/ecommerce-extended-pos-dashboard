"use client"

import React from "react"
import Modal from "@/components/Common/Modal"
import CustomInput from "@/components/FormFields/CustomInput"
import CustomTextArea from "@/components/FormFields/CustomTextArea"
import CustomFileUpload from "@/components/FormFields/CustomFileUpload"
import CustomButton from "@/components/Common/CustomButton"
import CustomRichTextEditor from "@/components/Common/CustomRichTextEditor"
import CustomCheckbox from "@/components/FormFields/CustomCheckbox"
import CustomSelect from "@/components/FormFields/CustomSelect"
import Seo from "@/components/Product/ProductForm/Seo"
import CustomTab, { CustomTabItem } from "@/components/Common/CustomTab"
import BlogDetails from "@/components/Blog/BlogDetails"
import { useCreateBlog, useUpdateBlog } from '@/hooks/blog.api'
import { useForm } from "react-hook-form"
import { useAllCategories } from "@/hooks/blog-category.api"
import { useAllTags } from "@/hooks/blog-tag.api"
import { useRouter } from "next/navigation"
// Using inline SVG for the image remove button to match upload preview

interface BlogValues {
  id?: string
  title?: string
  shortDescription?: string
  content?: string
  image?: string
  author?: string
  category?: string
  tags?: string[]
  seo?: any
}

interface Props {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultValues?: BlogValues
  onSave?: (values: BlogValues) => void
  submitting?: boolean
  asPage?: boolean
}


export default function CreateBlog({ open, onOpenChange, defaultValues, onSave, submitting = false, asPage = false }: Props) {
  const router = useRouter()
  const [title, setTitle] = React.useState(defaultValues?.title ?? "")
  const [shortDescription, setShortDescription] = React.useState(defaultValues?.shortDescription ?? "")
  const [content, setContent] = React.useState(defaultValues?.content ?? "")
  const [author, setAuthor] = React.useState(defaultValues?.author ?? "")
  const [category, setCategory] = React.useState(defaultValues?.category ?? "")
  const [tags, setTags] = React.useState<string[]>(defaultValues?.tags ?? [])
  const [imageFiles, setImageFiles] = React.useState<any[]>([])
  const [isEditorProcessing, setIsEditorProcessing] = React.useState(false)
  const categoryForm = useForm<{ category: string }>({ defaultValues: { category: defaultValues?.category ?? "" } });
  const categoriesQuery = useAllCategories();
  const categories = categoriesQuery.data ?? [];
  const categoryOptions = React.useMemo(() => categories.map((c) => ({ label: c.name, value: c.id })), [categories]);
  const tagsQuery = useAllTags();
  const allTags = tagsQuery.data ?? [];
  const tagList = React.useMemo(() => allTags.map((t) => ({ id: t.id, name: t.name })), [allTags]);

  const createMutation = useCreateBlog();
  const updateMutation = useUpdateBlog();
  const isSaving = (createMutation as any).isPending || (updateMutation as any).isPending || submitting;
  const [removedExistingImage, setRemovedExistingImage] = React.useState(false);
  const [seoData, setSeoData] = React.useState({ metaTitle: '', metaDescription: '', seoKeywords: [] as string[] });
  const initialSnapshotRef = React.useRef<any>(null);

  const hasImage = imageFiles.length > 0 || (!!defaultValues?.image && !removedExistingImage);
  const isFormValid = Boolean(
    (title ?? '').toString().trim() &&
      (author ?? '').toString().trim() &&
      (shortDescription ?? '').toString().trim() &&
      (content ?? '').toString().trim() &&
      (category ?? '') &&
      hasImage
  );

  const tabItems: CustomTabItem[] = React.useMemo(() => {
    const items: CustomTabItem[] = [
      {
        id: 'details',
        label: 'Blog Details',
        content: (
          <BlogDetails
            title={title}
            setTitle={setTitle}
            author={author}
            setAuthor={setAuthor}
            shortDescription={shortDescription}
            setShortDescription={setShortDescription}
            content={content}
            setContent={setContent}
            onEditorProcessingChange={setIsEditorProcessing}
          />
        )
      },

      {
        id: 'seo',
        label: 'SEO',
        content: (
          <>
            <Seo initialData={seoData} onChange={(data: any) => setSeoData(data)} />
          </>
        )
      }
    ];

    return items;
  }, [title, author, shortDescription, content, seoData]);

  React.useEffect(() => {
    setTitle(defaultValues?.title ?? "")
    setShortDescription(defaultValues?.shortDescription ?? "")
    setContent(defaultValues?.content ?? "")
    setAuthor(defaultValues?.author ?? "")
    setCategory(defaultValues?.category ?? "")
    categoryForm.reset({ category: defaultValues?.category ?? "" })
    setTags(defaultValues?.tags ?? [])
    setImageFiles([])
    setRemovedExistingImage(false)
    // map backend seo shape to Seo component shape if necessary
    const initialSeo = defaultValues?.seo
      ? (() => {
          const s = defaultValues.seo as any;
          return { metaTitle: s.title ?? '', metaDescription: s.description ?? '', seoKeywords: Array.isArray(s.keyword) ? s.keyword : [] };
        })()
      : { metaTitle: '', metaDescription: '', seoKeywords: [] as string[] };

    setSeoData(initialSeo);

    // capture initial snapshot for edit-mode dirty checking
    initialSnapshotRef.current = {
      title: defaultValues?.title ?? '',
      shortDescription: defaultValues?.shortDescription ?? '',
      content: defaultValues?.content ?? '',
      author: defaultValues?.author ?? '',
      category: defaultValues?.category ?? '',
      tags: defaultValues?.tags ?? [],
      hasImage: !!defaultValues?.image,
      seo: initialSeo,
    };
  }, [defaultValues, open])

  const isDirty = React.useMemo(() => {
    // only enforce dirty-check in edit mode
    if (!defaultValues) return true;
    if (imageFiles.length > 0 || removedExistingImage) return true;
    const initial = initialSnapshotRef.current ?? {};
    const current = {
      title: title ?? '',
      shortDescription: shortDescription ?? '',
      content: content ?? '',
      author: author ?? '',
      category: category ?? '',
      tags: tags ?? [],
      hasImage: imageFiles.length > 0 || (!!defaultValues?.image && !removedExistingImage),
      seo: seoData ?? {},
    };

    try {
      return JSON.stringify(current) !== JSON.stringify(initial);
    } catch (_e) {
      return true;
    }
  }, [defaultValues, title, shortDescription, content, author, category, tags, imageFiles.length, removedExistingImage, seoData]);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((p) => p !== t) : [...prev, t]))
  }

  const handleSave = async () => {
    if (isSaving || isEditorProcessing) return;

    const isEdit = !!defaultValues?.id;

    try {
      if (isEdit) {
        const id = defaultValues!.id as string;

        if (imageFiles.length && imageFiles[0].file) {
          const fd = new FormData();
          fd.append('title', title ?? '');
          fd.append('authorName', author ?? '');
          fd.append('shortDescription', shortDescription ?? '');
          fd.append('content', content ?? '');
          fd.append('categoryId', category ?? '');
          fd.append('tagIds', JSON.stringify(tags ?? []));
          fd.append('image', imageFiles[0].file, imageFiles[0].name);
          const seoPayload = { title: seoData.metaTitle ?? '', description: seoData.metaDescription ?? '', keyword: seoData.seoKeywords ?? [] };
          fd.append('seo', JSON.stringify(seoPayload));

          const result = await updateMutation.mutateAsync({ id, payload: fd });
          if (onSave) onSave({ title, shortDescription, content, image: result.payload?.image ?? undefined, author, category, tags, seo: seoData });
        } else {
          const payload: any = {
            title: title ?? undefined,
            authorName: author ?? undefined,
            shortDescription: shortDescription ?? undefined,
            content: content ?? undefined,
            categoryId: category ?? undefined,
            tagIds: JSON.stringify(tags ?? [])
          };

          payload.seo = { title: seoData.metaTitle ?? '', description: seoData.metaDescription ?? '', keyword: seoData.seoKeywords ?? [] };

          if (removedExistingImage) {
            payload.image = null;
          }

          const result = await updateMutation.mutateAsync({ id, payload });
          if (onSave) onSave({ title, shortDescription, content, image: result.payload?.image ?? undefined, author, category, tags, seo: seoData });
        }

        if (asPage && !onSave) {
          router.push('/dashboard/blog/manage');
        } else if (!asPage) {
          onOpenChange?.(false);
        }

        return;
      }

      const fd = new FormData();
      fd.append('title', title ?? '');
      fd.append('authorName', author ?? '');
      fd.append('shortDescription', shortDescription ?? '');
      fd.append('content', content ?? '');
      fd.append('categoryId', category ?? '');
      fd.append('tagIds', JSON.stringify(tags ?? []));

      if (imageFiles.length && imageFiles[0].file) {
        fd.append('image', imageFiles[0].file, imageFiles[0].name);
      }
      const seoPayload = { title: seoData.metaTitle ?? '', description: seoData.metaDescription ?? '', keyword: seoData.seoKeywords ?? [] };
      fd.append('seo', JSON.stringify(seoPayload));

      const result = await createMutation.mutateAsync(fd);
      if (onSave) onSave({ title, shortDescription, content, image: result.payload?.image ?? undefined, author, category, tags, seo: seoData });

      if (asPage && !onSave) {
        router.push('/dashboard/blog/manage');
      } else if (!asPage) {
        onOpenChange?.(false);
      }
    } catch (err) {
      
    }
  }
  const formInner = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <CustomTab tabs={tabItems} className="space-y-4" tabListClassName="justify-start" />
        </div>

      <div className="lg:col-span-1 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Feature Image
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </label>
          <CustomFileUpload maxFiles={1} onFilesChange={(f) => setImageFiles(f)} />
          {defaultValues?.image && imageFiles.length === 0 && !removedExistingImage && (
            <div className="mt-3 relative inline-block">
              <img src={defaultValues.image} alt="preview" className="h-32 w-full object-cover rounded" />
              <button
                type="button"
                aria-label="Remove image"
                title="Remove image"
                className="absolute top-1 right-1 bg-background/80 hover:bg-background text-slate-500  p-1 rounded-full shadow"
                onClick={() => setRemovedExistingImage(true)}
              >
                <span className="sr-only">Remove image</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Category
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </label>
          <CustomSelect<{ category: string }>
            name="category"
            control={categoryForm.control}
            placeholder="Select category"
            options={categoryOptions}
            onChangeCallback={(v: string) => setCategory(v)}
            triggerClassName="w-full rounded-md border px-3 py-2 bg-background"
            disabled={categoriesQuery.isLoading}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-background px-4 py-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Tags
          </h3>
          <div className="mt-4 space-y-3 max-h-65 overflow-y-auto pr-2">
            {tagList.map((t) => (
              <CustomCheckbox key={t.id} label={t.name} checked={tags.includes(t.id)} onCheckedChange={() => toggleTag(t.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (asPage) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">{defaultValues ? "Edit Blog" : "Create Blog"}</h1>
          <p className="text-sm text-slate-600">{defaultValues ? "Edit the blog post details" : "Create a new blog post"}</p>
        </div>

        {formInner}

        <div className="flex w-full justify-center gap-2 mt-6">
          <CustomButton
            loading={isSaving}
            disabled={
              defaultValues
                ? (!isFormValid || !isDirty || isSaving || isEditorProcessing)
                : (!isFormValid || isSaving || isEditorProcessing)
            }
            onClick={handleSave}
          >
            {defaultValues ? "Update Blog" : "Save Blog"}
          </CustomButton>
        </div>
      </div>
    )
  }

  return (
    <Modal
      open={!!open}
      onOpenChange={onOpenChange ?? (() => {})}
      title={defaultValues ? "Edit Blog" : "Create Blog"}
      description={defaultValues ? "Edit the blog post details" : "Create a new blog post"}
      footer={
        <div className="flex gap-2">
          <CustomButton
            loading={isSaving}
            disabled={
              defaultValues
                ? (!isFormValid || !isDirty || isSaving || isEditorProcessing)
                : (!isFormValid || isSaving || isEditorProcessing)
            }
            onClick={handleSave}
          >
            {defaultValues ? "Update Blog" : "Save Blog"}
          </CustomButton>
        </div>
      }
    >
      {formInner}
    </Modal>
  )
}