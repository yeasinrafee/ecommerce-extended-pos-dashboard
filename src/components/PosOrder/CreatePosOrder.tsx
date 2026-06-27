"use client";

import React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Store,
  Package,
  ChevronLeft,
  ChevronRight,
  Check,
  Printer,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  usePosProducts,
  useCreatePosBill,
  useUpdatePosBill,
  usePosBill,
  fetchProductByBarcode,
  type PosProduct,
  type PosProductVariation,
  type PosBillDetail,
} from "@/hooks/pos.api";
import { useAllStores } from "@/hooks/store.api";
import { PaymentModal } from "./PaymentModal";

/* ─────────── barcode scanner hook ─────────── */

/**
 * Captures barcode scanner input reliably.
 *
 * Barcode scanners act as HID keyboards — they emit characters very fast
 * and finish with Enter.  We capture this at the window level regardless
 * of which element has focus (including search inputs) by comparing the
 * inter-keystroke timing.
 *
 * Key design decisions:
 *  - `minLength`: ignore anything shorter than a real barcode
 *  - `interKeyTimeout` (300ms): if no new key arrives within this window
 *    after the FIRST character, the partial buffer is discarded. 300ms is
 *    generous enough for any scanner but filters out human typing.
 *  - We do NOT block on INPUT/TEXTAREA focus — we just let the scan go
 *    through in parallel so the search box still works normally.
 */
function useBarcodeScanner(
  onScan: (barcode: string) => void,
  { minLength = 3, maxKeyInterval = 50 } = {},
) {
  const bufferRef    = React.useRef<string>("");
  const lastKeyTime  = React.useRef<number>(0);
  const timerRef     = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef    = React.useRef(onScan);
  onScanRef.current  = onScan;

  React.useEffect(() => {
    const flush = (e: KeyboardEvent) => {
      const code = bufferRef.current.replace(/\s/g, "").trim();
      bufferRef.current = "";
      lastKeyTime.current = 0;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (code.length >= minLength) {
        // Prevent the Enter from triggering search / form submit
        e.preventDefault();
        e.stopImmediatePropagation();
        onScanRef.current(code);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= minLength) flush(e);
        return;
      }

      if (e.key.length !== 1) return;   // ignore Shift, ArrowLeft, etc.

      const now = Date.now();
      const interval = now - lastKeyTime.current;

      // Scanner sends chars in bursts — each keystroke arrives < maxKeyInterval ms
      // apart.  If this char arrives too slowly it's human typing; reset.
      if (lastKeyTime.current !== 0 && interval > maxKeyInterval) {
        bufferRef.current = "";
      }

      lastKeyTime.current = now;
      bufferRef.current += e.key;

      // Safety: discard if no Enter arrives within 500 ms
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = "";
        lastKeyTime.current = 0;
        timerRef.current = null;
      }, 500);
    };

    // capture:true so we intercept before React's synthetic events
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [minLength, maxKeyInterval]);
}

/* ─────────── cart item shape ─────────── */

interface CartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  sku: string;
  variationId: string | null;
  variationLabel: string | null;
  unitPrice: number;
  basePrice: number;
  quantity: number;
}

const cartKey = (productId: string, variationId: string | null) =>
  variationId ? `${productId}::${variationId}` : productId;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CreatePosOrder: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEditMode = !!editId;

  const { data: existingBill } = usePosBill(editId ?? "");

  /* ── store selector ── */
  const { data: stores = [] } = useAllStores();
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");

  /* ── search ── */
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(
    undefined,
  );

  /* ── Order Display State ── */
  const [discountType, setDiscountType] = React.useState<
    "NONE" | "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT"
  >("NONE");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [taxPercent, setTaxPercent] = React.useState<number>(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim() || undefined);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  /* ── products ── */
  const { data: products = [], isLoading: productsLoading } = usePosProducts(
    searchTerm,
    selectedStoreId || undefined,
  );

  /* ── category tabs ── */
  const allCategories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.categories?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [products]);

  const [activeCategory, setActiveCategory] = React.useState<string | null>(
    null,
  );
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);

  const filteredProducts = React.useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => p.categories?.includes(activeCategory));
  }, [products, activeCategory]);

  /* ── expanded product (variant picker) ── */
  // null = no picker open; set to a PosProduct to show variant picker in right panel
  const [variantPickerProduct, setVariantPickerProduct] =
    React.useState<PosProduct | null>(null);

  /* ── cart ── */
  const [cart, setCart] = React.useState<Map<string, CartItem>>(new Map());
  const [editCartLoaded, setEditCartLoaded] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [successBill, setSuccessBill] = React.useState<PosBillDetail | null>(
    null,
  );

  /* ── barcode scanner ── */
  const [barcodeStatus, setBarcodeStatus] = React.useState<{
    state: "idle" | "scanning" | "error";
    message?: string;
  }>({ state: "idle" });
  const barcodeStatusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref so the barcode callback can call addToCart even though it's
  // defined after the hook (avoids dependency cycle).
  const addToCartRef = React.useRef<typeof addToCart | null>(null);

  const handleBarcodeScan = React.useCallback(
    async (barcode: string) => {
      // Clear search box in case scanner chars leaked into it
      setSearchInput("");
      setBarcodeStatus({ state: "scanning", message: `Looking up: ${barcode}` });
      if (barcodeStatusTimerRef.current) clearTimeout(barcodeStatusTimerRef.current);
      try {
        const product = await fetchProductByBarcode(barcode);
        if (product.productVariations.length === 0) {
          addToCartRef.current?.(product);
          setBarcodeStatus({ state: "idle" });
        } else {
          setVariantPickerProduct(product);
          setBarcodeStatus({ state: "idle" });
        }
      } catch {
        setBarcodeStatus({ state: "error", message: `No product for barcode: ${barcode}` });
        barcodeStatusTimerRef.current = setTimeout(
          () => setBarcodeStatus({ state: "idle" }),
          3000,
        );
      }
    },
    [],
  );

  useBarcodeScanner(handleBarcodeScan);

  /* ── populate cart from existing bill (edit mode) ── */
  React.useEffect(() => {
    if (!isEditMode || !existingBill || editCartLoaded) return;
    const newCart = new Map<string, CartItem>();
    existingBill.items.forEach((item) => {
      if (item.variations.length > 0) {
        item.variations.forEach((v) => {
          const key = cartKey(item.productId, v.id);
          newCart.set(key, {
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            sku: item.productSku,
            variationId: v.id,
            variationLabel: v.attributeValue,
            unitPrice: item.unitFinalPrice,
            basePrice: item.unitBasePrice,
            quantity: item.quantity,
          });
        });
      } else {
        const key = cartKey(item.productId, null);
        newCart.set(key, {
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          sku: item.productSku,
          variationId: null,
          variationLabel: null,
          unitPrice: item.unitFinalPrice,
          basePrice: item.unitBasePrice,
          quantity: item.quantity,
        });
      }
    });
    setCart(newCart);
    if (existingBill.storeId) setSelectedStoreId(existingBill.storeId);
    setEditCartLoaded(true);
  }, [isEditMode, existingBill, editCartLoaded]);

  /* ── pricing helper ── */
  const getProductPricing = (
    product: PosProduct,
    variation?: PosProductVariation,
  ) => {
    // 1. Determine base price (if variation, use its basePrice, else product's posPrice or Baseprice)
    let base = product.posPrice > 0 ? product.posPrice : product.Baseprice;
    if (variation) {
      base = variation.basePrice;
    }

    // 2. Calculate Final Price using product's discount fields
    let final = base;
    const { discountType, discountValue } = product;

    if (discountType === "PERCENTAGE_DISCOUNT" && discountValue) {
      final = base - (base * discountValue) / 100;
    } else if (discountType === "FLAT_DISCOUNT" && discountValue) {
      final = Math.max(0, base - discountValue);
    }

    return { base, final };
  };

  const addToCart = (product: PosProduct, variation?: PosProductVariation) => {
    setCart((prev) => {
      const next = new Map(prev);
      const key = cartKey(product.id, variation?.id ?? null);
      const existing = next.get(key);
      if (existing) {
        next.set(key, { ...existing, quantity: existing.quantity + 1 });
      } else {
        const pricing = getProductPricing(product, variation);

        next.set(key, {
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          sku: product.sku,
          variationId: variation?.id ?? null,
          variationLabel: variation?.attributeValue ?? null,
          unitPrice: pricing.final,
          basePrice: pricing.base,
          quantity: 1,
        });
      }
      return next;
    });
  };

  // Keep barcode scanner ref in sync
  addToCartRef.current = addToCart;

  const setItemQuantity = (key: string, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(key);
      if (!item) return prev;
      // Allow 0 for typing purposes, but it must be handled on blur
      next.set(key, { ...item, quantity: qty });
      return next;
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(key);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        next.delete(key);
      } else {
        next.set(key, { ...item, quantity: newQty });
      }
      return next;
    });
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const clearCart = () => setCart(new Map());

  const cartItems = React.useMemo(() => Array.from(cart.entries()), [cart]);
  const cartTotal = React.useMemo(
    () =>
      cartItems.reduce(
        (sum, [, item]) => sum + item.unitPrice * item.quantity,
        0,
      ),
    [cartItems],
  );
  const cartBaseTotal = React.useMemo(
    () =>
      cartItems.reduce(
        (sum, [, item]) => sum + item.basePrice * item.quantity,
        0,
      ),
    [cartItems],
  );

  const finalComputedTotal = React.useMemo(() => {
    let tot = cartTotal;
    if (discountType === "PERCENTAGE_DISCOUNT") {
      tot -= tot * (discountValue / 100);
    } else if (discountType === "FLAT_DISCOUNT") {
      tot -= discountValue;
    }
    tot = Math.max(0, tot);
    const taxAmount = tot * (taxPercent / 100);
    return tot + taxAmount;
  }, [cartTotal, discountType, discountValue, taxPercent]);

  const taxAmount = React.useMemo(() => {
    let tot = cartTotal;
    if (discountType === "PERCENTAGE_DISCOUNT") {
      tot -= tot * (discountValue / 100);
    } else if (discountType === "FLAT_DISCOUNT") {
      tot -= discountValue;
    }
    tot = Math.max(0, tot);
    return tot * (taxPercent / 100);
  }, [cartTotal, discountType, discountValue, taxPercent]);

  const subtotalAfterDiscount = React.useMemo(() => {
    let tot = cartTotal;
    if (discountType === "PERCENTAGE_DISCOUNT") {
      tot -= tot * (discountValue / 100);
    } else if (discountType === "FLAT_DISCOUNT") {
      tot -= discountValue;
    }
    return Math.max(0, tot);
  }, [cartTotal, discountType, discountValue]);
  const cartTotalQty = React.useMemo(
    () => cartItems.reduce((sum, [, item]) => sum + item.quantity, 0),
    [cartItems],
  );

  /* ── build payload ── */
  const buildPayload = (payments?: import("@/hooks/pos.api").PosPayment[]) => {
    const grouped = new Map<
      string,
      {
        variationIds: string[];
        variationQuantities: number[];
        plainQty: number;
      }
    >();
    cartItems.forEach(([, item]) => {
      const entry = grouped.get(item.productId) ?? {
        variationIds: [],
        variationQuantities: [],
        plainQty: 0,
      };
      if (item.variationId) {
        entry.variationIds.push(item.variationId);
        entry.variationQuantities.push(item.quantity);
      } else {
        entry.plainQty += item.quantity;
      }
      grouped.set(item.productId, entry);
    });

    const prods: any[] = [];
    grouped.forEach((entry, productId) => {
      if (entry.variationIds.length > 0) {
        prods.push({
          productId,
          variationIds: entry.variationIds,
          variationQuantities: entry.variationQuantities,
        });
      } else {
        prods.push({ productId, quantity: entry.plainQty });
      }
    });

    return {
      ...(selectedStoreId ? { storeId: selectedStoreId } : {}),
      discountType: discountType !== "NONE" ? discountType : undefined,
      discountValue: discountType !== "NONE" ? discountValue : undefined,
      tax: taxPercent > 0 ? taxPercent : undefined,
      products: prods,
      ...(payments && payments.length > 0 ? { payments } : {}),
    };
  };

  /* ── submit ── */
  const createMutation = useCreatePosBill();
  const updateMutation = useUpdatePosBill();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (payments?: import("@/hooks/pos.api").PosPayment[]) => {
    if (cartItems.length === 0) return;
    const payload = buildPayload(payments);
    if (isEditMode && editId) {
      updateMutation.mutate(
        { orderId: editId, payload },
        {
          onSuccess: (data) => {
            const totalInPayload =
              payload.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
            const enriched = {
              ...data,
              // Prefer backend's own fields; fall back to the local taxPercent
              taxPercent: data.taxPercent ?? taxPercent,
              taxAmount: data.taxAmount ?? 0,
              payments: data.payments?.length
                ? data.payments
                : payload.payments,
              totalPaid: data.totalPaid || totalInPayload,
              dueAmount:
                data.dueAmount !== undefined
                  ? data.dueAmount
                  : Math.max(
                      0,
                      data.finalAmount - (data.totalPaid || totalInPayload),
                    ),
            };
            setSuccessBill(enriched);
            clearCart();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (data) => {
          const totalInPayload =
            payload.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
          const enriched = {
            ...data,
            // Prefer backend's own fields; fall back to the local taxPercent
            taxPercent: data.taxPercent ?? taxPercent,
            taxAmount: data.taxAmount ?? 0,
            payments: data.payments?.length ? data.payments : payload.payments,
            totalPaid: data.totalPaid || totalInPayload,
            dueAmount:
              data.dueAmount !== undefined
                ? data.dueAmount
                : Math.max(
                    0,
                    data.finalAmount - (data.totalPaid || totalInPayload),
                  ),
          };
          setSuccessBill(enriched);
          clearCart();
        },
      });
    }
  };

  /* ── product actions ── */
  const handleProductClick = (product: PosProduct) => {
    if (product.productVariations.length === 0) {
      addToCart(product);
      return;
    }
    setVariantPickerProduct(product);
  };

  const scrollCategories = (dir: "left" | "right") => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: dir === "left" ? -250 : 250,
        behavior: "smooth",
      });
    }
  };

  /* ── helpers ── */
  const isProductInCart = (productId: string) =>
    cartItems.some(([, item]) => item.productId === productId);

  const getProductCartQty = (productId: string) =>
    cartItems
      .filter(([, item]) => item.productId === productId)
      .reduce((sum, [, item]) => sum + item.quantity, 0);

  /* ━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━ */

  return (
    <div className="relative flex flex-col lg:flex-row h-[calc(100vh-80px)] lg:h-[calc(100vh-64px)] bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* ════════════ LEFT: Product Panel ════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 shrink-0">
              {isEditMode ? "Edit Order" : "Point of Sale (POS)"}
            </h1>
            {stores.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Store className="size-4 text-gray-500 hidden sm:block" />
                <Select
                  value={selectedStoreId}
                  onValueChange={(v) =>
                    setSelectedStoreId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-8 w-[140px] sm:w-[180px] bg-white border-gray-300 rounded-full text-xs sm:text-sm shadow-none! focus:ring-1 focus:ring-blue-300">
                    <SelectValue placeholder="Select Store" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="rounded-lg shadow-md border-gray-200"
                  >
                    <SelectItem value="__none__">All Stores</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Clean Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              id="pos-search"
              type="text"
              placeholder="Search product name or SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 text-sm text-gray-900 rounded-full focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Barcode Scanner Status */}
          {barcodeStatus.state !== "idle" && (
            <div
              className={cn(
                "mt-2 flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium border",
                barcodeStatus.state === "scanning"
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-red-50 border-red-200 text-red-700",
              )}
            >
              {barcodeStatus.state === "scanning" ? (
                <span className="size-3 rounded-full border-2 border-blue-400 border-t-blue-700 animate-spin shrink-0" />
              ) : (
                <X className="size-3 shrink-0" />
              )}
              {barcodeStatus.message}
            </div>
          )}
        </div>

        {/* Category tabs - Rounded pill design */}
        <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            {allCategories.length > 4 && (
              <button
                onClick={() => scrollCategories("left")}
                className="shrink-0 size-8 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            <div
              ref={categoryScrollRef}
              className="flex gap-2 overflow-x-auto scroll-smooth"
              style={{ scrollbarWidth: "none" }}
            >
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-full border transition-colors",
                  !activeCategory
                    ? "bg-blue-700 border-blue-700 text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600",
                )}
              >
                All Categories
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-full border transition-colors",
                    activeCategory === cat
                      ? "bg-blue-700 border-blue-700 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            {allCategories.length > 4 && (
              <button
                onClick={() => scrollCategories("right")}
                className="shrink-0 size-8 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-4 xl:p-5 pb-24 lg:pb-5">
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 sm:h-60 bg-white animate-pulse rounded-lg shadow-sm"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Package className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700">
                No products found
              </h3>
              <p className="text-gray-500">
                Please adjust your search or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const hasVariations = product.productVariations.length > 0;
                const inCart = isProductInCart(product.id);
                const cartQty = getProductCartQty(product.id);
                const isActive = variantPickerProduct?.id === product.id;
                const pricing = getProductPricing(product);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      "group flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-all",
                      isActive
                        ? "border-blue-500 ring-2 ring-blue-400 shadow-md bg-white"
                        : inCart
                          ? "border-blue-300 ring-1 ring-blue-200 shadow-sm hover:shadow-md bg-white"
                          : "border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md bg-white",
                    )}
                  >
                    {/* Image area */}
                    <div className={cn(
                      "relative overflow-hidden rounded-t-lg p-2",
                      inCart ? "bg-blue-50" : "bg-gray-50",
                    )}>
                      <div className="relative w-full aspect-4/3 rounded-md overflow-hidden">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-100 rounded-md">
                            <Package className="size-8 text-gray-300" />
                          </div>
                        )}

                        {/* Stock badge — top right */}
                        {product.stock > 0 ? (
                          <span className={cn(
                            "absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm",
                            product.stock <= 5
                              ? "bg-rose-500 text-white"
                              : "bg-emerald-500 text-white",
                          )}>
                            {product.stock} In Stock
                          </span>
                        ) : (
                          <span className="absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm bg-gray-500 text-white">
                            Out of Stock
                          </span>
                        )}

                        {/* In-cart badge — top left */}
                        {inCart && (
                          <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full flex items-center gap-0.5 leading-none shadow-sm">
                            <Check className="size-2.5" /> {cartQty}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className={cn(
                      "px-2.5 py-2 sm:px-3 sm:py-2.5 flex flex-col gap-0.5 flex-1",
                      inCart ? "bg-blue-50/30" : "bg-white",
                    )}>
                      <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium uppercase tracking-wide truncate">
                        SKU: {product.sku || "N/A"}
                      </p>
                      <h3 className={cn(
                        "text-xs sm:text-sm font-bold leading-snug line-clamp-2 flex-1",
                        inCart ? "text-blue-900" : "text-gray-900",
                      )}>
                        {product.name}
                      </h3>

                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm sm:text-base font-bold text-blue-700 leading-none">
                            ৳{pricing.final.toFixed(2)}
                          </span>
                          {pricing.final < pricing.base && (
                            <span className="text-[10px] text-gray-400 line-through leading-none mt-0.5">
                              ৳{pricing.base.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {hasVariations ? (
                          <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase shrink-0 ml-1">
                            {product.productVariations.length} opts
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                            className={cn(
                              "size-6 sm:size-7 rounded-md flex items-center justify-center transition-colors shrink-0 ml-1",
                              inCart
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100",
                            )}
                          >
                            {inCart ? <Check className="size-3 sm:size-3.5" /> : <Plus className="size-3 sm:size-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Floating Bar */}
      {!isCartOpen && !variantPickerProduct && (
        <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
            </p>
            <p className="text-lg font-bold text-blue-600">
              ৳{finalComputedTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-sm font-bold hover:bg-blue-700 transition"
          >
            <ShoppingCart className="size-5" />
            View Order
          </button>
        </div>
      )}

      {/* ════════════ RIGHT: Order Panel ════════════ */}
      <div
        className={cn(
          "w-full lg:w-[400px] xl:w-[420px] 2xl:w-[520px] shrink-0 bg-white flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200 h-full min-h-0 overflow-hidden",
          isCartOpen || variantPickerProduct
            ? "absolute inset-0 z-50 lg:static lg:z-auto"
            : "hidden lg:flex",
        )}
      >
        {/* ── Variant Picker Panel (replaces cart when open) ── */}
        {variantPickerProduct ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setVariantPickerProduct(null)}
                  className="shrink-0 p-1 hover:bg-gray-200 rounded-sm text-gray-600"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium uppercase">Select Options</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {variantPickerProduct.name}
                  </p>
                </div>
              </div>
              <button
                className="lg:hidden p-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-sm"
                onClick={() => { setVariantPickerProduct(null); setIsCartOpen(false); }}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Product preview */}
            <div className="p-4 border-b border-gray-200 bg-white shrink-0 flex gap-3 items-center">
              <div className="size-14 bg-gray-100 border border-gray-200 shrink-0 relative overflow-hidden rounded-sm">
                {variantPickerProduct.image ? (
                  <Image
                    src={variantPickerProduct.image}
                    alt={variantPickerProduct.name}
                    fill
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <Package className="size-6 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 uppercase font-bold truncate">{variantPickerProduct.sku}</p>
                <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{variantPickerProduct.name}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  ৳{getProductPricing(variantPickerProduct).final.toFixed(0)}
                </p>
              </div>
            </div>

            {/* Variants grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                {variantPickerProduct.productVariations.length} Available Options — tap to add
              </p>
              <div className="grid grid-cols-2 gap-2">
                {variantPickerProduct.productVariations.map((v) => {
                  const vKey = cartKey(variantPickerProduct.id, v.id);
                  const vInCart = cart.has(vKey);
                  const vQty = cart.get(vKey)?.quantity ?? 0;
                  const pricing = getProductPricing(variantPickerProduct, v);

                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        if (vInCart) {
                          removeFromCart(vKey);
                        } else {
                          addToCart(variantPickerProduct, v);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-start p-3 border rounded-sm text-left transition-colors",
                        vInCart
                          ? "bg-green-50 border-green-500 text-green-800"
                          : "bg-white border-gray-200 text-gray-800 hover:border-blue-500 hover:bg-blue-50",
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold truncate">{v.attributeValue}</span>
                        {vInCart ? (
                          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 shrink-0">
                            ×{vQty}
                          </span>
                        ) : (
                          <Plus className="size-3.5 text-gray-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        ৳{pricing.final.toFixed(0)}
                        {pricing.final < pricing.base && (
                          <span className="text-[10px] text-gray-400 line-through ml-1">
                            ৳{pricing.base.toFixed(0)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done button */}
            <div className="p-4 border-t border-gray-300 bg-gray-50 shrink-0">
              {(() => {
                const selectedCount = variantPickerProduct.productVariations.filter(
                  (v) => cart.has(cartKey(variantPickerProduct.id, v.id))
                ).length;
                return (
                  <button
                    onClick={() => setVariantPickerProduct(null)}
                    className={cn(
                      "w-full py-2.5 font-bold text-sm rounded-sm flex items-center justify-center gap-2 transition-colors",
                      selectedCount > 0
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300",
                    )}
                  >
                    <Check className="size-4" />
                    {selectedCount > 0 ? `Done — ${selectedCount} option${selectedCount > 1 ? "s" : ""} added` : "Close"}
                  </button>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            {/* ── Cart Header ── */}
            <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-gray-900">
                {isEditMode ? "Editing Order" : "Current Order"}
              </h2>
              <div className="flex items-center gap-3">
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  className="lg:hidden p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
                  onClick={() => setIsCartOpen(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* ── Order Items List ── */}
            <div className="flex-1 overflow-y-auto bg-white">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                  <ShoppingCart className="size-12 mb-3 text-gray-200" />
                  <p className="text-sm font-semibold text-gray-600">Cart is empty</p>
                  <p className="text-xs mt-1 text-gray-400">Select items from the product list to begin.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cartItems.map(([key, item]) => (
                    <div key={key} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors">
                      {/* Thumbnail */}
                      <div className="size-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden relative">
                        {item.productImage ? (
                          <Image src={item.productImage} alt="" fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="size-4 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Name + unit price — flex-1 + min-w-0 ensures truncation, never pushes siblings */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                          {item.productName}
                        </p>
                        {item.variationLabel && (
                          <p className="text-[10px] text-blue-500 font-medium truncate">{item.variationLabel}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                          ৳{item.unitPrice.toFixed(2)} / unit
                        </p>
                      </div>

                      {/* Qty stepper — fixed width, never shrinks */}
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => updateQuantity(key, -1)}
                          className="w-7 h-7 rounded-l border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="size-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            if (valStr === "") { setItemQuantity(key, 0); return; }
                            const val = parseInt(valStr, 10);
                            if (!isNaN(val)) setItemQuantity(key, val);
                          }}
                          onBlur={() => { if (item.quantity === 0) setItemQuantity(key, 1); }}
                          className="w-16 h-7 text-center text-sm font-semibold text-gray-900 border-y border-gray-300 bg-white outline-none"
                        />
                        <button
                          onClick={() => updateQuantity(key, 1)}
                          className="w-7 h-7 rounded-r border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Line total + remove — fixed min-width */}
                      <div className="flex flex-col items-end justify-center shrink-0 w-16">
                        <span className="text-xs font-bold text-blue-700 whitespace-nowrap">
                          ৳{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                        {item.unitPrice < item.basePrice && (
                          <span className="text-[9px] text-gray-400 line-through leading-none">
                            ৳{(item.basePrice * item.quantity).toFixed(2)}
                          </span>
                        )}
                        <button
                          onClick={() => removeFromCart(key)}
                          className="mt-1 text-red-400 hover:text-red-500 transition-colors"
                          title="Remove"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Summary + Actions ── */}
            {cartItems.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 shrink-0 space-y-1.5">

                {/* Discount type, value and tax */}
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => {
                        const v = e.target.value as typeof discountType;
                        setDiscountType(v);
                        if (v === "NONE") setDiscountValue(0);
                      }}
                      className="w-full h-7 rounded-md border border-gray-300 bg-white text-xs text-gray-700 px-2 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="NONE">No Discount</option>
                      <option value="PERCENTAGE_DISCOUNT">% Discount</option>
                      <option value="FLAT_DISCOUNT">Flat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Disc. Value</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountValue || ""}
                      disabled={discountType === "NONE"}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full h-7 rounded-md border border-gray-300 bg-white text-xs text-gray-900 px-2 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <div className="col-span-2 xl:col-span-1">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Tax (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={taxPercent || ""}
                      onChange={(e) => setTaxPercent(Math.max(0, Number(e.target.value)))}
                      className="w-full h-7 rounded-md border border-gray-300 bg-white text-xs text-gray-900 px-2 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Breakdown rows */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal ({cartTotalQty} items)</span>
                    <span>৳{cartTotal.toFixed(2)}</span>
                  </div>
                  {discountType !== "NONE" && discountValue > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Discount{discountType === "PERCENTAGE_DISCOUNT" ? ` (${discountValue}%)` : " (flat)"}</span>
                      <span className="text-rose-500">−৳{(cartTotal - subtotalAfterDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  {taxPercent > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tax ({taxPercent}%)</span>
                      <span>৳{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center border-t border-gray-200 pt-1.5">
                  <span className="text-sm font-bold text-gray-800">Total</span>
                  <span className="text-lg font-bold text-blue-700">৳{finalComputedTotal.toFixed(2)}</span>
                </div>

                {/* Buttons */}
                <div className="space-y-1.5 pb-1">
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={isSubmitting || cartItems.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl py-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShoppingCart className="size-3.5" />
                    )}
                    Complete Sale
                  </button>
                  <button
                    onClick={() => {
                      handleSubmit();
                      if (typeof window !== "undefined" && window.innerWidth < 1024) setIsCartOpen(false);
                    }}
                    disabled={isSubmitting || cartItems.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-600 text-xs font-semibold rounded-xl py-2 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <span className="size-3.5 border-2 border-gray-400/50 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <Printer className="size-3.5" />
                    )}
                    Save Order
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════ PAYMENT MODAL ════════════ */}
      {isPaymentModalOpen && (
        <PaymentModal
          totalAmount={finalComputedTotal}
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirm={(payments: import("@/hooks/pos.api").PosPayment[]) => {
            setIsPaymentModalOpen(false);
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setIsCartOpen(false);
            }
            handleSubmit(payments);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* ════════════ SUCCESS MODAL ════════════ */}
      {successBill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 p-6 flex flex-col items-center justify-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Check className="size-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Order Successful!</h2>
              <p className="text-green-100 mt-1">
                Invoice: {successBill.invoiceNumber}
              </p>
            </div>

            <div className="p-6 flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-gray-500 font-medium">Total Amount:</span>
                <span className="font-bold text-xl text-gray-900">
                  ৳{successBill.finalAmount.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => {
                  import("@/utils/posPrint").then((m) =>
                    m.printPosReceipt(successBill),
                  );
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition"
              >
                <Printer className="size-5" />
                Print POS Receipt
              </button>

              <button
                onClick={() => {
                  setSuccessBill(null);
                  if (
                    typeof window !== "undefined" &&
                    window.innerWidth < 1024
                  ) {
                    setIsCartOpen(false);
                  }
                  router.push("/dashboard/pos-order/manage");
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-md font-bold hover:bg-gray-200 transition mt-1"
              >
                Go to Orders
              </button>

              <button
                onClick={() => {
                  setSuccessBill(null);
                  if (
                    typeof window !== "undefined" &&
                    window.innerWidth < 1024
                  ) {
                    setIsCartOpen(false);
                  }
                  if (isEditMode) {
                    router.push("/dashboard/pos-order/create");
                  } else {
                    setSearchInput("");
                    setActiveCategory(null);
                  }
                }}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-md font-bold hover:bg-gray-50 transition"
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePosOrder;
