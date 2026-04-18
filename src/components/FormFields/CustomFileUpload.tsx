"use client";

import * as React from "react";
import { CloudUpload, X } from "lucide-react";

export type CustomFileUploadFile = {
  id: string;
  file: File;
  name: string;
  url: string;
};

interface CustomFileUploadProps {
  label?: string;
  description?: string;
  helperText?: string;
  maxFiles: number;
  className?: string;
  accept?: string;
  disabled?: boolean;
  requiredMark?: boolean;
  onFilesChange?: (files: CustomFileUploadFile[]) => void;
}

type QueuedFile = {
  id: string;
  file: File;
  name: string;
  progress: number;
};

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_MIME = new Set(DEFAULT_ACCEPT.split(","));

const createFileId = (fileName: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${fileName}-${Date.now()}`;
};

const normalizeMime = (file: File) => {
  if (file.type) {
    return file.type.toLowerCase();
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext) {
    return `image/${ext}`;
  }
  return "";
};

const CustomFileUpload: React.FC<CustomFileUploadProps> = ({
  label = "Drag & drop files",
  description,
  helperText,
  maxFiles,
  accept = DEFAULT_ACCEPT,
  className,
  disabled = false,
  requiredMark = false,
  onFilesChange,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [queuedFiles, setQueuedFiles] = React.useState<QueuedFile[]>([]);
  const [files, setFiles] = React.useState<CustomFileUploadFile[]>([]);
  const latestFilesRef = React.useRef<CustomFileUploadFile[]>([]);

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const toRemove = prev.find((file) => file.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.url);
      }
      return prev.filter((file) => file.id !== id);
    });
  };

  const handleFiles = (fileList: FileList | null) => {
    if (disabled) return;
    setErrors([]);
    if (!fileList?.length) return;

    let availableSlots = maxFiles - (files.length + queuedFiles.length);
    if (maxFiles === 1 && files.length === 1 && queuedFiles.length === 0) {
      setFiles((prev) => {
        prev.forEach((file) => URL.revokeObjectURL(file.url));
        return [];
      });
      availableSlots = 1;
    }

    if (availableSlots <= 0) {
      setErrors([
        `Maximum of ${maxFiles} file${maxFiles === 1 ? "" : "s"} allowed.`,
      ]);
      return;
    }

    const incomingFiles: File[] = [];
    const nextErrors: string[] = [];

    Array.from(fileList).forEach((file) => {
      const mime = normalizeMime(file);
      if (!SUPPORTED_MIME.has(mime)) {
        nextErrors.push(`${file.name} is not a supported format.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        nextErrors.push(`${file.name} exceeds the 5MB size limit.`);
        return;
      }
      incomingFiles.push(file);
    });

    if (!incomingFiles.length) {
      setErrors(nextErrors);
      return;
    }

    const toAdd = incomingFiles.slice(0, availableSlots);
    if (incomingFiles.length > toAdd.length) {
      nextErrors.push(
        `Only ${availableSlots} file${availableSlots === 1 ? "" : "s"} can be added right now.`,
      );
    }

    setErrors(nextErrors);
    setQueuedFiles((prev) => [
      ...prev,
      ...toAdd.map((file) => ({
        id: createFileId(file.name),
        file,
        name: file.name,
        progress: 0,
      })),
    ]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    if (!queuedFiles.length) return;
    const interval = window.setInterval(() => {
      setQueuedFiles((current) =>
        current.map((item) => ({
          ...item,
          progress: Math.min(100, item.progress + 12 + Math.random() * 18),
        })),
      );
    }, 220);
    return () => window.clearInterval(interval);
  }, [queuedFiles.length]);

  React.useEffect(() => {
    if (!queuedFiles.length) return;
    const completed = queuedFiles.filter((item) => item.progress >= 100);
    if (!completed.length) return;

    setFiles((prev) => [
      ...prev,
      ...completed.map((entry) => ({
        id: entry.id,
        name: entry.name,
        file: entry.file,
        url: URL.createObjectURL(entry.file),
      })),
    ]);
    setQueuedFiles((prev) => prev.filter((entry) => entry.progress < 100));
  }, [queuedFiles]);

  React.useEffect(() => {
    latestFilesRef.current = files;
    if (onFilesChange) {
      onFilesChange(files);
    }
  }, [files]);

  React.useEffect(
    () => () => {
      latestFilesRef.current.forEach((file) => URL.revokeObjectURL(file.url));
    },
    [],
  );

  const overallProgress =
    queuedFiles.length > 0
      ? Math.min(
          100,
          Math.round(
            queuedFiles.reduce((acc, entry) => acc + entry.progress, 0) /
              queuedFiles.length,
          ),
        )
      : 0;

  const progressLabel = queuedFiles.length
    ? `Uploading ${queuedFiles.length} file${queuedFiles.length === 1 ? "" : "s"}`
    : undefined;

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFileDialog();
          }
        }}
        onClick={openFileDialog}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragging(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition focus:outline-none focus:ring ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 bg-background"
        }`}> 
        <CloudUpload className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {label}
          {requiredMark ? (
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500">
          {description ?? "PNG, JPG, JPEG, or WEBP up to 5MB each."}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {files.length}/{maxFiles} uploaded
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          disabled={disabled}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
      {helperText && (
        <p className="mt-2 text-xs text-slate-500">{helperText}</p>
      )}
      {queuedFiles.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{progressLabel}</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div className="mt-3 space-y-1 text-xs font-medium text-destructive">
          {errors.map((error, index) => (
            <p key={`upload-error-${index}`}>{error}</p>
          ))}
        </div>
      )}
      {files.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <div
              key={file.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-background"
            >
              <img
                src={file.url}
                alt={file.name}
                className="h-32 w-full object-cover"
              />
              <div className="p-2 text-xs text-slate-600">
                <p className="truncate font-medium text-slate-700">
                  {file.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-slate-500 transition hover:bg-background"
                aria-label={`Remove ${file.name}`}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomFileUpload;