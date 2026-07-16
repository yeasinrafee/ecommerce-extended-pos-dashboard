"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetProduct } from "@/hooks/product.api";
import { Skeleton } from "@/components/ui/skeleton";
import { BiBarcodeReader } from "react-icons/bi";
import {
  Tag,
  Package,
  Layers,
  BadgePercent,
  Info,
  Globe,
  ChevronRight,
  ImageOff,
} from "lucide-react";

interface ProductDetailsProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ── small helpers ─────────────────────────────────────────────────────────── */

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const cls = {
    default: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 p-1">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ── main component ────────────────────────────────────────────────────────── */

export default function ProductDetails({
  productId,
  open,
  onOpenChange,
}: ProductDetailsProps) {
  const { data: product, isLoading } = useGetProduct(productId ?? "");

  const p = product as any;

  const statusVariant =
    p?.status === "ACTIVE" ? "success" : "default";

  const stockVariant =
    p?.stockStatus === "IN_STOCK"
      ? "info"
      : p?.stockStatus === "LOW_STOCK"
        ? "warning"
        : "danger";

  const stockLabel =
    p?.stockStatus === "IN_STOCK"
      ? "In Stock"
      : p?.stockStatus === "LOW_STOCK"
        ? "Low Stock"
        : "Out of Stock";

  const discountLabel =
    p?.discountType === "FLAT_DISCOUNT"
      ? `৳${p.discountValue} off`
      : p?.discountType === "PERCENTAGE_DISCOUNT"
        ? `${p.discountValue}% off`
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          {isLoading || !p ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-6">
              {/* ── Hero ── */}
              <div className="flex gap-4">
                {/* Main image */}
                <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-7 w-7 text-slate-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                    {p.name}
                  </h2>
                  {p.brand?.name && (
                    <p className="text-sm text-slate-500 mt-0.5">{p.brand.name}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant={statusVariant}>
                      {p.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={stockVariant}>{stockLabel}</Badge>
                    {discountLabel && (
                      <Badge variant="warning">{discountLabel}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Pricing ── */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <SectionTitle icon={BadgePercent} title="Pricing" />
                <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                  <div className="px-3">
                    <p className="text-xs text-slate-400 mb-0.5">Base Price</p>
                    <p className="font-semibold text-slate-800">
                      <span className="text-base">৳</span>
                      {p.Baseprice ?? p.basePrice ?? "-"}
                    </p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-slate-400 mb-0.5">Final Price</p>
                    <p className="font-semibold text-indigo-700">
                      <span className="text-base">৳</span>
                      {p.finalPrice ?? "-"}
                    </p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-slate-400 mb-0.5">POS Price</p>
                    <p className="font-semibold text-slate-800">
                      {p.posPrice != null ? (
                        <>
                          <span className="text-base">৳</span>
                          {p.posPrice}
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── General info ── */}
              <div>
                <SectionTitle icon={Info} title="General Information" />
                <div className="rounded-xl border border-slate-100 px-4 py-2">
                  <InfoRow
                    label="Barcode"
                    value={
                      p.barcodeId ? (
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <BiBarcodeReader className="text-slate-400" size={15} />
                          {p.barcodeId}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )
                    }
                  />
                  <InfoRow
                    label="SKU"
                    value={p.sku ?? <span className="text-slate-400">-</span>}
                  />
                  <InfoRow
                    label="Stock"
                    value={`${p.stock ?? 0} pcs`}
                  />
                  <InfoRow
                    label="Weight"
                    value={p.weight ? `${p.weight} g/ml` : <span className="text-slate-400">-</span>}
                  />
                  {(p.length || p.width || p.height) && (
                    <InfoRow
                      label="Dimensions"
                      value={`${p.length ?? "-"} × ${p.width ?? "-"} × ${p.height ?? "-"} cm`}
                    />
                  )}
                </div>
              </div>

              {/* ── Categories & Tags ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SectionTitle icon={Layers} title="Categories" />
                  <div className="flex flex-wrap gap-1.5">
                    {p.categories?.length > 0 ? (
                      p.categories.map((c: any) => (
                        <Badge key={c.categoryId} variant="default">
                          {c.category?.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </div>
                </div>
                <div>
                  <SectionTitle icon={Tag} title="Tags" />
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags?.length > 0 ? (
                      p.tags.map((t: any) => (
                        <Badge key={t.tagId} variant="info">
                          {t.tag?.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Variants / Attributes ── */}
              {p.productVariations?.length > 0 && (
                <div>
                  <SectionTitle icon={Package} title="Variants" />
                  <div className="space-y-2">
                    {Object.entries(
                      (p.productVariations as any[]).reduce(
                        (acc: Record<string, any[]>, v: any) => {
                          const name = v.attribute?.name ?? "Unknown";
                          if (!acc[name]) acc[name] = [];
                          acc[name].push(v);
                          return acc;
                        },
                        {}
                      )
                    ).map(([attrName, variants]: [string, any[]]) => (
                      <div
                        key={attrName}
                        className="rounded-lg border border-slate-100 px-3 py-2.5"
                      >
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          {attrName}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variants.map((v: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                            >
                              {v.galleryImage && (
                                <div className="relative h-5 w-5 rounded overflow-hidden shrink-0">
                                  <Image
                                    src={v.galleryImage}
                                    alt={v.attributeValue}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <span className="text-xs text-slate-700">
                                {v.attributeValue}
                              </span>
                              {v.basePrice != null && (
                                <span className="text-xs text-slate-400">
                                  · ৳{v.basePrice}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Additional Info ── */}
              {p.additionalInformations?.length > 0 && (
                <div>
                  <SectionTitle icon={ChevronRight} title="Additional Information" />
                  <div className="rounded-xl border border-slate-100 px-4 py-2">
                    {p.additionalInformations.map((info: any, i: number) => (
                      <InfoRow key={i} label={info.name} value={info.value} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Gallery ── */}
              {p.galleryImages?.length > 0 && (
                <div>
                  <SectionTitle icon={ImageOff} title="Gallery" />
                  <div className="flex flex-wrap gap-2">
                    {(p.galleryImages as string[]).map((url, i) => (
                      <div
                        key={i}
                        className="relative h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                      >
                        <Image
                          src={url}
                          alt={`Gallery ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SEO ── */}
              {p.seos?.length > 0 && (
                <div>
                  <SectionTitle icon={Globe} title="SEO" />
                  <div className="rounded-xl border border-slate-100 px-4 py-2">
                    <InfoRow label="Meta Title" value={p.seos[0].title || "-"} />
                    <InfoRow
                      label="Meta Description"
                      value={p.seos[0].description || <span className="text-slate-400">-</span>}
                    />
                    {p.seos[0].keyword?.length > 0 && (
                      <InfoRow
                        label="Keywords"
                        value={
                          <div className="flex flex-wrap gap-1 justify-end">
                            {p.seos[0].keyword.map((kw: string, i: number) => (
                              <Badge key={i} variant="default">{kw}</Badge>
                            ))}
                          </div>
                        }
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
