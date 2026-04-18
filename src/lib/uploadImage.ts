import { apiClient } from './api';
import { UploadRoutes } from '@/routes/upload.route';
import { toast } from 'react-hot-toast';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const toWebp = async (file: File): Promise<File> => {
  // createImageBitmap is supported in modern browsers
  const bitmap = await createImageBitmap(file as Blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.drawImage(bitmap, 0, 0);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('Image conversion failed');

  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  const webpFile = new File([blob], name, { type: 'image/webp' });
  return webpFile;
};

export const uploadImageFromEditor = async (file: File) => {
  // small debounce to batch any immediate changes
  await delay(500);

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    const msg = 'Unsupported file type. Allowed: png, jpeg, webp';
    toast.error(msg);
    throw new Error(msg);
  }

  if (file.size > MAX_BYTES) {
    const msg = 'File too large. Maximum size is 5MB.';
    toast.error(msg);
    throw new Error(msg);
  }

  let fileToUpload = file;
  if (file.type !== 'image/webp') {
    try {
      fileToUpload = await toWebp(file);
    } catch (err: any) {
      const msg = err?.message || 'Failed to convert image to webp';
      toast.error(msg);
      throw err;
    }

    if (fileToUpload.size > MAX_BYTES) {
      const msg = 'Converted image exceeds 5MB limit.';
      toast.error(msg);
      throw new Error(msg);
    }
  }

  const fd = new FormData();
  fd.append('image', fileToUpload, fileToUpload.name);

  const toastId = toast.loading('Uploading image...');

    try {
      const resp = await apiClient.post(UploadRoutes.images, fd);
      const body = resp.data;
      if (!body || !body.success) {
        const msg = body?.message || 'Upload failed';
        toast.error(msg, { id: toastId });
        throw new Error(msg);
      }

      const url = body.data?.url ?? null;
      const publicId = body.data?.publicId ?? null;
      if (!url) {
        const msg = 'Upload did not return a URL';
        toast.error(msg, { id: toastId });
        throw new Error(msg);
      }

      toast.success('Image uploaded', { id: toastId });
      return { url: url as string, publicId: publicId as string | null };
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed', { id: toastId });
      throw err;
    }
};

export const deleteUploadedImage = async (publicIdOrUrl: string) => {
  if (!publicIdOrUrl) return null;

  try {
    const isUrl = typeof publicIdOrUrl === 'string' && publicIdOrUrl.startsWith('http');
    const payload = isUrl ? { url: publicIdOrUrl } : { publicId: publicIdOrUrl };

    const resp = await apiClient.post(UploadRoutes.delete, payload);
    const body = resp.data;
    if (!body || !body.success) {
      throw new Error(body?.message || 'Delete failed');
    }

    toast.success('Image removed');
    return true;
  } catch (err: any) {
    toast.error(err?.message || 'Failed to remove image');
    throw err;
  }
};
