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
  Pause,
  List,
  Printer,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  usePosProducts,
  useCreatePosBill,
  useUpdatePosBill,
  usePosBill,
  type PosProduct,
  type PosProductVariation,
  type PosBillDetail,
} from "@/hooks/pos.api";
import { useAllStores } from "@/hooks/store.api";
import { PaymentModal } from "./PaymentModal";

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
  const [expandedProductId, setExpandedProductId] = React.useState<
    string | null
  >(null);
  const [selectedVariationIds, setSelectedVariationIds] = React.useState<
    Record<string, boolean>
  >({});

  /* ── cart ── */
  const [cart, setCart] = React.useState<Map<string, CartItem>>(new Map());
  const [editCartLoaded, setEditCartLoaded] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [successBill, setSuccessBill] = React.useState<PosBillDetail | null>(
    null,
  );

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
    return Math.max(0, tot);
  }, [cartBaseTotal, discountType, discountValue]);
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
            // Backend processes payments in background, so we enrich the
            // immediate response with payload data for printing/UI.
            const totalInPayload =
              payload.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
            const enriched = {
              ...data,
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
  const toggleProductExpansion = (product: PosProduct) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
    }
  };

  const handleProductClick = (product: PosProduct) => {
    if (product.productVariations.length === 0) {
      addToCart(product);
      return;
    }
    toggleProductExpansion(product);
  };

  const handleAddVariationsToCart = (product: PosProduct) => {
    const varIds = Object.keys(selectedVariationIds).filter(
      (id) => selectedVariationIds[id],
    );
    if (varIds.length === 0) return;
    varIds.forEach((vId) => {
      const variation = product.productVariations.find((v) => v.id === vId);
      if (variation) addToCart(product, variation);
    });
    setExpandedProductId(null);
    setSelectedVariationIds({});
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
        {/* Simple Flat Header Area */}
        <div className="p-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <h1 className="text-xl font-bold text-gray-900">
              {isEditMode ? "Edit Order" : "Point of Sale (POS)"}
            </h1>
            {stores.length > 0 && (
              <div className="flex items-center gap-2">
                <Store className="size-4 text-gray-500" />
                <Select
                  value={selectedStoreId}
                  onValueChange={(v) =>
                    setSelectedStoreId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 w-[180px] bg-white border-gray-300 rounded-sm shadow-none! focus:ring-1 focus:ring-black">
                    <SelectValue placeholder="Select Store" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="rounded-sm shadow-none! border-gray-300"
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

          {/* Clean Flat Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              id="pos-search"
              type="text"
              placeholder="Search product name or SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 text-base text-gray-900 rounded-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs - Flat Button Design */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            {allCategories.length > 4 && (
              <button
                onClick={() => scrollCategories("left")}
                className="shrink-0 size-8 border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600"
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
                  "px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-sm border",
                  !activeCategory
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
                )}
              >
                All Items
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-sm border",
                    activeCategory === cat
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            {allCategories.length > 4 && (
              <button
                onClick={() => scrollCategories("right")}
                className="shrink-0 size-8 border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product grid - Flat cards */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 pb-24 lg:pb-5">
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 animate-pulse border border-gray-300 rounded-sm"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const hasVariations = product.productVariations.length > 0;
                const inCart = isProductInCart(product.id);
                const cartQty = getProductCartQty(product.id);
                const isExpanded = expandedProductId === product.id;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group flex flex-col bg-white border border-gray-300 hover:border-gray-400 rounded-sm relative overflow-hidden transition-colors",
                      isExpanded && "border-blue-600 ring-1 ring-blue-600",
                    )}
                  >
                    {/* Visual Area */}
                    <div
                      className="relative h-36 bg-gray-50 flex items-center justify-center p-3 border-b border-gray-200 cursor-pointer"
                      onClick={() =>
                        hasVariations
                          ? toggleProductExpansion(product)
                          : handleProductClick(product)
                      }
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-1"
                        />
                      ) : (
                        <Package className="size-10 text-gray-200" />
                      )}

                      {/* Stock Status */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 border border-amber-200 uppercase">
                            Low Stock
                          </span>
                        )}
                        {product.stock <= 0 && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 border border-red-200 uppercase">
                            Out of Stock
                          </span>
                        )}
                      </div>

                      {/* In Cart Indicator */}
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-green-600 text-white px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                          <Check className="size-3" /> {cartQty}
                        </div>
                      )}

                    </div>

                    {/* Content Area */}
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1 text-[10px] text-gray-500">
                          <span className="truncate uppercase font-bold text-gray-400">
                            {product.sku || "N/A"}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-baseline justify-between mb-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 leading-none">
                              ৳{getProductPricing(product).final.toFixed(0)}
                            </span>
                            {(product.discountType === "PERCENTAGE_DISCOUNT" ||
                              product.discountType === "FLAT_DISCOUNT") && (
                              <span className="text-[9px] text-gray-400 line-through">
                                ৳{(product.posPrice > 0 ? product.posPrice : product.Baseprice).toFixed(0)}
                              </span>
                            )}
                          </div>
                          {hasVariations && (
                            <span className="text-[10px] text-blue-600 font-bold uppercase">
                              {product.productVariations.length} Variants
                            </span>
                          )}
                        </div>

                        {hasVariations ? (
                          <div className="space-y-1.5">
                            {isExpanded ? (
                              <div className="flex flex-col gap-1">
                                <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                                  {product.productVariations.map((v) => {
                                    const vKey = cartKey(product.id, v.id);
                                    const vInCart = cartItems.some(([k]) => k === vKey);
                                    return (
                                      <button
                                        key={v.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!vInCart) addToCart(product, v);
                                        }}
                                        className={cn(
                                          "px-1 py-1 text-[9px] font-bold border rounded-sm transition-colors text-center truncate",
                                          vInCart 
                                            ? "bg-green-100 border-green-600 text-green-700" 
                                            : "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600"
                                        )}
                                      >
                                        {v.attributeValue}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedProductId(null);
                                  }}
                                  className="w-full text-[9px] font-bold text-gray-400 hover:text-red-500 py-1 uppercase"
                                >
                                  Close Options
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => toggleProductExpansion(product)}
                                className="w-full py-1.5 text-[10px] font-bold rounded-sm border border-blue-600 text-blue-600 hover:bg-blue-50 uppercase flex items-center justify-center gap-1"
                              >
                                <Plus className="size-3" /> Select Options
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleProductClick(product)}
                            disabled={product.stock <= 0}
                            className={cn(
                              "w-full py-1.5 text-[10px] font-bold rounded-sm border transition-colors uppercase flex items-center justify-center gap-1",
                              inCart
                                ? "bg-green-100 border-green-600 text-green-700"
                                : "bg-gray-900 border-gray-900 text-white hover:bg-black disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400"
                            )}
                          >
                            {inCart ? <><Check className="size-3" /> In Cart</> : <><Plus className="size-3" /> Add To Bag</>}
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
      {!isCartOpen && (
        <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
            </p>
            <p className="text-lg font-bold text-blue-600">
              ৳{cartTotal.toFixed(2)}
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
          "w-full lg:w-[380px] shrink-0 bg-white flex flex-col border-t lg:border-t-0 lg:border-l border-gray-300 h-full lg:h-full min-h-0 overflow-hidden",
          isCartOpen
            ? "absolute inset-0 z-50 lg:static lg:z-auto"
            : "hidden lg:flex",
        )}
      >
        {/* Simple Header */}
        <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="size-5 text-gray-500" />
            {isEditMode ? "Editing Order" : "Current Order"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-gray-200 text-gray-800 px-2 py-0.5 text-xs font-bold rounded-sm border border-gray-300">
              {cartItems.length} items
            </span>
            <button
              className="lg:hidden p-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-sm"
              onClick={() => setIsCartOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {cartItems.length > 0 && (
          <div className="px-4 py-2 bg-white border-b border-gray-200 flex justify-end">
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
            >
              <Trash2 className="size-3" /> Clear Cart
            </button>
          </div>
        )}

        {/* Order Items List */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
              <ShoppingCart className="size-12 mb-2 text-gray-300" />
              <p className="text-base font-semibold text-gray-700">
                Cart is empty
              </p>
              <p className="text-sm">
                Select items from the products list to begin taking this order.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {cartItems.map(([key, item]) => (
                <div
                  key={key}
                  className="p-3 bg-white hover:bg-gray-50 flex gap-3"
                >
                  {/* Thumbnail */}
                  <div className="size-12 bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                    {item.productImage ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={item.productImage}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Package className="size-5 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {item.productName}
                        </p>
                        <button
                          onClick={() => removeFromCart(key)}
                          className="shrink-0 text-red-400 hover:text-red-600 transition"
                          title="Remove item"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {item.variationLabel && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          Variant: {item.variationLabel}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-gray-900">
                        ৳{(item.unitPrice * item.quantity).toFixed(2)}
                      </p>

                      {/* Control */}
                      <div className="flex items-center border border-gray-300 rounded-sm bg-white">
                        <button
                          onClick={() => updateQuantity(key, -1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 border-r border-gray-300"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            if (valStr === "") {
                              setItemQuantity(key, 0);
                              return;
                            }
                            const val = parseInt(valStr, 10);
                            if (!isNaN(val)) setItemQuantity(key, val);
                          }}
                          onBlur={() => {
                            if (item.quantity === 0) setItemQuantity(key, 1);
                          }}
                          className="w-12 h-7 text-center text-sm font-semibold text-gray-900 outline-none bg-transparent"
                        />
                        <button
                          onClick={() => updateQuantity(key, 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 border-l border-gray-300"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Panel (Flat) */}
        {cartItems.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-300 px-4 py-4 shrink-0">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
              <span>Subtotal ({cartTotalQty} items)</span>
              <span>৳{cartTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-800 mb-2 font-semibold">
              <span>Order Discount</span>
            </div>
            <div className="flex gap-2 mb-4">
              <Select
                value={discountType}
                onValueChange={(
                  v: "NONE" | "PERCENTAGE_DISCOUNT" | "FLAT_DISCOUNT",
                ) => {
                  setDiscountType(v);
                  if (v === "NONE") setDiscountValue(0);
                }}
              >
                <SelectTrigger className="flex-1 bg-white border-gray-300 shadow-none">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Discount</SelectItem>
                  <SelectItem value="PERCENTAGE_DISCOUNT">
                    % Discount
                  </SelectItem>
                  <SelectItem value="FLAT_DISCOUNT">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
              {discountType !== "NONE" && (
                <input
                  type="number"
                  placeholder="Value"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-24 px-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              )}
            </div>

            <div className="flex justify-between items-end border-t border-gray-300 pt-2 mt-2 mb-4">
              <span className="text-sm font-bold text-gray-800 uppercase">
                Total
              </span>
              <span className="text-2xl font-bold text-gray-900">
                ৳{finalComputedTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2 flex-col sm:flex-row">
              <button
                onClick={() => {
                  handleSubmit();
                  if (
                    typeof window !== "undefined" &&
                    window.innerWidth < 1024
                  ) {
                    setIsCartOpen(false);
                  }
                }}
                disabled={isSubmitting || cartItems.length === 0}
                className="flex-1 shrink flex items-center justify-center gap-2 bg-white border border-green-600 text-green-700 text-sm font-bold rounded-sm py-2.5 hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="size-4 border-2 border-green-600/50 border-r-green-600 rounded-full animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Save Order
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={isSubmitting || cartItems.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white text-base font-bold rounded-sm py-2.5 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Pay & Save
              </button>
            </div>
          </div>
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
