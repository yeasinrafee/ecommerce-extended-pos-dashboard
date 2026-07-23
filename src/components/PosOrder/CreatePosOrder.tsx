'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ScanBarcode,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  usePosProducts,
  useCreatePosBill,
  useUpdatePosBill,
  usePosBill,
  fetchProductByBarcode,
  type PosProduct,
  type PosProductVariation,
  type PosBillDetail,
} from '@/hooks/pos.api';
import { useAllStores } from '@/hooks/store.api';
import {
  useSearchPosCustomers,
  type PosCustomer,
} from '@/hooks/pos-customer.api';
import { PaymentModal } from './PaymentModal';
import { useSidebarContext } from '@/components/Dashboard/Shared/Sidebar';

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
  const bufferRef = React.useRef<string>('');
  const lastKeyTime = React.useRef<number>(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = React.useRef(onScan);
  onScanRef.current = onScan;

  React.useEffect(() => {
    const flush = (e: KeyboardEvent) => {
      const code = bufferRef.current.replace(/\s/g, '').trim();
      bufferRef.current = '';
      lastKeyTime.current = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (code.length >= minLength) {
        // Prevent the Enter from triggering search / form submit
        e.preventDefault();
        e.stopImmediatePropagation();
        onScanRef.current(code);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) flush(e);
        return;
      }

      if (e.key.length !== 1) return; // ignore Shift, ArrowLeft, etc.

      const now = Date.now();
      const interval = now - lastKeyTime.current;

      // Scanner sends chars in bursts — each keystroke arrives < maxKeyInterval ms
      // apart.  If this char arrives too slowly it's human typing; reset.
      if (lastKeyTime.current !== 0 && interval > maxKeyInterval) {
        bufferRef.current = '';
      }

      lastKeyTime.current = now;
      bufferRef.current += e.key;

      // Safety: discard if no Enter arrives within 500 ms
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
        lastKeyTime.current = 0;
        timerRef.current = null;
      }, 500);
    };

    // capture:true so we intercept before React's synthetic events
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
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
  stock: number;
}

const cartKey = (productId: string, variationId: string | null) =>
  variationId ? `${productId}::${variationId}` : productId;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CreatePosOrder: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const isEditMode = !!editId;

  const { data: existingBill } = usePosBill(editId ?? '');

  /* ── store selector ── */
  const { data: stores = [] } = useAllStores();
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('');

  /* ── search ── */
  const [searchInput, setSearchInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(
    undefined,
  );

  /* ── Order Display State ── */
  const [posCustomerId, setPosCustomerId] = React.useState<string | null>(null);
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerSearchPhone, setCustomerSearchPhone] = React.useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = React.useState(false);
  const [selectedPosCustomer, setSelectedPosCustomer] =
    React.useState<PosCustomer | null>(null);
  const searchDropdownRef = React.useRef<HTMLDivElement>(null);
  const [discountType, setDiscountType] = React.useState<
    'NONE' | 'PERCENTAGE_DISCOUNT' | 'FLAT_DISCOUNT'
  >('NONE');
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

  /* ── pos customer search ── */
  const { data: searchedCustomers = [], isFetching: customersSearching } =
    useSearchPosCustomers(customerSearchPhone);

  // Close search dropdown on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node)
      ) {
        setCustomerSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    state: 'idle' | 'scanning' | 'error';
    message?: string;
  }>({ state: 'idle' });
  const barcodeStatusTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Stable ref so the barcode callback can call addToCart even though it's
  // defined after the hook (avoids dependency cycle).
  const addToCartRef = React.useRef<typeof addToCart | null>(null);

  const handleBarcodeScan = React.useCallback(async (barcode: string) => {
    // Clear search box in case scanner chars leaked into it
    setSearchInput('');
    setBarcodeStatus({ state: 'scanning', message: `Looking up: ${barcode}` });
    if (barcodeStatusTimerRef.current)
      clearTimeout(barcodeStatusTimerRef.current);
    try {
      const product = await fetchProductByBarcode(barcode);
      if (product.productVariations.length === 0) {
        addToCartRef.current?.(product);
        setBarcodeStatus({ state: 'idle' });
      } else {
        setVariantPickerProduct(product);
        setBarcodeStatus({ state: 'idle' });
      }
    } catch {
      setBarcodeStatus({
        state: 'error',
        message: `No product for barcode: ${barcode}`,
      });
      barcodeStatusTimerRef.current = setTimeout(
        () => setBarcodeStatus({ state: 'idle' }),
        3000,
      );
    }
  }, []);

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
            stock: 999999,
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
          stock: 999999,
        });
      }
    });
    setCart(newCart);
    if (existingBill.storeId) setSelectedStoreId(existingBill.storeId);
    if (existingBill.posCustomerId)
      setPosCustomerId(existingBill.posCustomerId);
    if (existingBill.posCustomer) {
      setSelectedPosCustomer(existingBill.posCustomer as PosCustomer);
    }
    if (existingBill.customerName) setCustomerName(existingBill.customerName);
    if (existingBill.customerPhone)
      setCustomerPhone(existingBill.customerPhone);
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

    if (discountType === 'PERCENTAGE_DISCOUNT' && discountValue) {
      final = base - (base * discountValue) / 100;
    } else if (discountType === 'FLAT_DISCOUNT' && discountValue) {
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
          stock: product.stock,
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
      } else if (delta > 0 && newQty > item.stock) {
        // Do not allow exceeding stock via + button
        return prev;
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
    if (discountType === 'PERCENTAGE_DISCOUNT') {
      tot -= tot * (discountValue / 100);
    } else if (discountType === 'FLAT_DISCOUNT') {
      tot -= discountValue;
    }
    tot = Math.max(0, tot);
    const taxAmount = tot * (taxPercent / 100);
    return tot + taxAmount;
  }, [cartTotal, discountType, discountValue, taxPercent]);

  const taxAmount = React.useMemo(() => {
    let tot = cartTotal;
    if (discountType === 'PERCENTAGE_DISCOUNT') {
      tot -= tot * (discountValue / 100);
    } else if (discountType === 'FLAT_DISCOUNT') {
      tot -= discountValue;
    }
    tot = Math.max(0, tot);
    return tot * (taxPercent / 100);
  }, [cartTotal, discountType, discountValue, taxPercent]);

  const subtotalAfterDiscount = React.useMemo(() => {
    let tot = cartTotal;
    if (discountType === 'PERCENTAGE_DISCOUNT') {
      tot -= tot * (discountValue / 100);
    } else if (discountType === 'FLAT_DISCOUNT') {
      tot -= discountValue;
    }
    return Math.max(0, tot);
  }, [cartTotal, discountType, discountValue]);
  const cartTotalQty = React.useMemo(
    () => cartItems.reduce((sum, [, item]) => sum + item.quantity, 0),
    [cartItems],
  );

  const hasStockErrors = React.useMemo(
    () => cartItems.some(([, item]) => item.quantity > item.stock),
    [cartItems],
  );

  /* ── build payload ── */
  const buildPayload = (payments?: import('@/hooks/pos.api').PosPayment[]) => {
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
      ...(posCustomerId ? { posCustomerId } : {}),
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      discountType: discountType !== 'NONE' ? discountType : undefined,
      discountValue: discountType !== 'NONE' ? discountValue : undefined,
      tax: taxPercent > 0 ? taxPercent : undefined,
      products: prods,
      ...(payments && payments.length > 0 ? { payments } : {}),
    };
  };

  /* ── submit ── */
  const createMutation = useCreatePosBill();
  const updateMutation = useUpdatePosBill();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (payments?: import('@/hooks/pos.api').PosPayment[]) => {
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

  const scrollCategories = (dir: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: dir === 'left' ? -250 : 250,
        behavior: 'smooth',
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

  const { collapsed: sidebarCollapsed } = useSidebarContext();
  const gridClass = sidebarCollapsed
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4';

  /* ━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━ */

  return (
    <div className='relative flex flex-col lg:flex-row h-full bg-gray-50 text-gray-900 font-sans overflow-hidden'>
      {/* ════════════ LEFT: Product Panel ════════════ */}
      <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'>
        {/* Header */}
        <div className='px-4 py-3 bg-white border-b border-gray-200 shrink-0'>
          {/* ── Customer Selection Section ── */}
          <div className='mb-3'>
            {selectedPosCustomer ? (
              /* ── Selected Customer Card ── */
              <div className='relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent border border-primary/20 shadow-sm'>
                <div className='absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-full -mr-4 -mt-4' />
                <div className='relative px-4 py-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='size-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm shadow-primary/20'>
                        <span className='text-base font-bold'>
                          {(selectedPosCustomer.name || 'C')
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className='text-sm font-bold text-gray-900 leading-tight'>
                          {selectedPosCustomer.name}
                        </p>
                        <p className='text-xs text-gray-500 mt-0.5'>
                          {selectedPosCustomer.phone}
                        </p>
                      </div>
                      <div className='hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-150 shadow-sm'>
                        <span className='text-xs font-bold text-primary'>
                          {selectedPosCustomer._count?.posOrders ?? 0}
                        </span>
                        <span className='text-[10px] text-gray-400'>
                          orders
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPosCustomer(null);
                        setPosCustomerId(null);
                        setCustomerName('');
                        setCustomerPhone('');
                        setCustomerSearchPhone('');
                      }}
                      className='flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-all hover:text-red-600 hover:border-red-200'
                    >
                      <X className='size-3' />
                      Change Customer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Customer Search ── */
              <div ref={searchDropdownRef} className='relative'>
                {/* Label + search box */}
                <label className='block text-[13px] font-semibold text-gray-700 mb-1.5'>
                  Customer <span className='text-red-400'>*</span>
                </label>
                <div
                  className={cn(
                    'flex items-stretch rounded-lg border bg-white overflow-hidden transition-all duration-200',
                    customerSearchOpen && customerSearchPhone.length >= 3
                      ? 'border-primary ring-2 ring-primary/10 shadow-sm'
                      : 'border-gray-300 hover:border-gray-400',
                  )}
                >
                  <div className='flex items-center justify-center pl-3 text-gray-400'>
                    <Search className='size-4' />
                  </div>
                  <input
                    type='text'
                    inputMode='numeric'
                    placeholder='Search by phone number'
                    value={customerSearchPhone}
                    onChange={(e) => {
                      setCustomerSearchPhone(e.target.value);
                      setCustomerPhone(e.target.value);
                      if (e.target.value.length >= 3)
                        setCustomerSearchOpen(true);
                      else setCustomerSearchOpen(false);
                    }}
                    onFocus={() => {
                      if (customerSearchPhone.length >= 3)
                        setCustomerSearchOpen(true);
                    }}
                    className='flex-1 h-10 pl-2 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none'
                  />
                  {customerSearchPhone && (
                    <button
                      type='button'
                      onClick={() => {
                        setCustomerSearchPhone('');
                        setCustomerPhone('');
                        setCustomerSearchOpen(false);
                      }}
                      className='px-3 text-gray-400 hover:text-gray-600 transition-colors'
                    >
                      <X className='size-3.5' />
                    </button>
                  )}
                </div>

                {/* ── Dropdown: results OR add-new form ── */}
                {customerSearchOpen && customerSearchPhone.length >= 3 && (
                  <div className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto overflow-x-hidden'>
                    {customersSearching ? (
                      <div className='flex items-center justify-center gap-2 px-4 py-5'>
                        <span className='size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin' />
                        <span className='text-sm text-gray-400'>
                          Searching…
                        </span>
                      </div>
                    ) : searchedCustomers.length > 0 ? (
                      /* ── Existing customers found ── */
                      <div className='py-1'>
                        {searchedCustomers.map((c) => (
                          <button
                            key={c.id}
                            type='button'
                            onClick={() => {
                              setSelectedPosCustomer(c);
                              setPosCustomerId(c.id);
                              setCustomerName(c.name);
                              setCustomerPhone(c.phone);
                              setCustomerSearchPhone('');
                              setCustomerSearchOpen(false);
                            }}
                            className='w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/[0.04] transition-colors text-left group'
                          >
                            <div className='size-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/25 transition-all'>
                              <span className='text-sm font-bold text-primary'>
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className='min-w-0 flex-1'>
                              <p className='text-[13px] font-semibold text-gray-900 truncate'>
                                {c.name}
                              </p>
                              <p className='text-[11px] text-gray-500 mt-0.5'>
                                {c.phone}
                              </p>
                            </div>
                            <div className='shrink-0'>
                              <span className='text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors'>
                                {c._count?.posOrders ?? 0} orders
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* ── No results → add new customer form ── */
                      <div className='px-4 py-3 space-y-3'>
                        <p className='text-[13px] text-gray-400 italic'>
                          No Customer — add new below
                        </p>

                        {/* Phone — auto-filled from search */}
                        <div>
                          <label className='block text-[11px] font-semibold text-gray-500 mb-1'>
                            Phone / Mobile
                          </label>
                          <input
                            type='text'
                            readOnly
                            value={customerPhone}
                            className='w-full h-9 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-600 px-3 cursor-default'
                          />
                        </div>

                        {/* Name input inside dropdown */}
                        <div>
                          <label className='block text-[11px] font-semibold text-gray-500 mb-1'>
                            Name <span className='text-red-400'>*</span>
                          </label>
                          <input
                            type='text'
                            placeholder='Customer name'
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className='w-full h-9 rounded-md border border-gray-200 bg-white text-sm text-gray-900 px-3 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary placeholder:text-gray-350 transition-all'
                          />
                        </div>

                        {/* Add button inside dropdown */}
                        <button
                          type='button'
                          disabled={
                            !customerPhone.trim() || !customerName.trim()
                          }
                          onClick={() => {
                            if (!customerPhone.trim() || !customerName.trim())
                              return;
                            setPosCustomerId(null);
                            setSelectedPosCustomer({
                              id: '',
                              name: customerName.trim(),
                              phone: customerPhone.trim(),
                              isDeleted: false,
                              posOrderIds: [],
                              createdAt: '',
                              updatedAt: '',
                              _count: { posOrders: 0 },
                            });
                            setCustomerSearchPhone('');
                            setCustomerSearchOpen(false);
                          }}
                          className='w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-lg transition-colors'
                        >
                          <Plus className='size-4' />
                          Add Customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='flex items-center justify-between gap-3 mb-3'>
            <h1 className='text-lg sm:text-xl font-bold text-gray-900 shrink-0'>
              {isEditMode ? 'Edit Order' : 'Point of Sale (POS)'}
            </h1>
            {stores.length > 0 && (
              <div className='flex items-center gap-1.5 shrink-0'>
                <Store className='size-4 text-gray-500 hidden sm:block' />
                <Select
                  value={selectedStoreId}
                  onValueChange={(v) =>
                    setSelectedStoreId(v === '__none__' ? '' : v)
                  }
                >
                  <SelectTrigger className='h-8 w-[140px] sm:w-[180px] bg-white border-gray-300 rounded-full text-xs sm:text-sm shadow-none! focus:ring-1 focus:ring-primary/30'>
                    <SelectValue placeholder='Select Store' />
                  </SelectTrigger>
                  <SelectContent
                    position='popper'
                    className='rounded-lg shadow-md border-gray-200'
                  >
                    <SelectItem value='__none__'>All Stores</SelectItem>
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
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400' />
            <input
              id='pos-search'
              type='text'
              placeholder='Search product name, sku or barcode'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='w-full pl-10 pr-20 py-2.5 bg-gray-50 border border-gray-200 text-sm text-gray-900 rounded-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'
            />
            {searchInput && (
              <button
                type='button'
                onClick={() => setSearchInput('')}
                className='absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors'
              >
                <X className='size-4' />
              </button>
            )}
            <button
              type='button'
              onClick={() => document.getElementById('pos-search')?.focus()}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors'
              title='Scan barcode'
            >
              <ScanBarcode className='size-5' />
            </button>
          </div>

          {/* Barcode Scanner Status */}
          {barcodeStatus.state !== 'idle' && (
            <div
              className={cn(
                'mt-2 flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium border',
                barcodeStatus.state === 'scanning'
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-red-50 border-red-200 text-red-700',
              )}
            >
              {barcodeStatus.state === 'scanning' ? (
                <span className='size-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin shrink-0' />
              ) : (
                <X className='size-3 shrink-0' />
              )}
              {barcodeStatus.message}
            </div>
          )}
        </div>

        {/* Category tabs - Rounded pill design */}
        <div className='px-3 sm:px-4 py-2.5 bg-white border-b border-gray-200 shrink-0'>
          <div className='flex items-center gap-2'>
            {allCategories.length > 4 && (
              <button
                onClick={() => scrollCategories('left')}
                className='shrink-0 size-8 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600'
              >
                <ChevronLeft className='size-4' />
              </button>
            )}
            <div
              ref={categoryScrollRef}
              className='flex gap-2 overflow-x-auto scroll-smooth'
              style={{ scrollbarWidth: 'none' }}
            >
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  'px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-full border transition-colors',
                  !activeCategory
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-primary/50 hover:text-primary',
                )}
              >
                All Categories
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-full border transition-colors',
                    activeCategory === cat
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-primary/50 hover:text-primary',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            {allCategories.length > 4 && (
              <button
                onClick={() => scrollCategories('right')}
                className='shrink-0 size-8 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600'
              >
                <ChevronRight className='size-4' />
              </button>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className='flex-1 overflow-y-auto p-3 sm:p-4 lg:p-4 xl:p-5 pb-24 md:pb-24 lg:pb-5'>
          {productsLoading ? (
            <div className={`grid ${gridClass} gap-2.5 sm:gap-3`}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className='h-56 sm:h-60 bg-white animate-pulse rounded-lg shadow-sm'
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-center'>
              <Package className='size-16 text-gray-300 mb-4' />
              <h3 className='text-lg font-bold text-gray-700'>
                No products found
              </h3>
              <p className='text-gray-500'>
                Please adjust your search or category.
              </p>
            </div>
          ) : (
            <div className={`grid ${gridClass} gap-2.5 sm:gap-3`}>
              {filteredProducts.map((product) => {
                const hasVariations = product.productVariations.length > 0;
                const inCart = isProductInCart(product.id);
                const cartQty = getProductCartQty(product.id);
                const isActive = variantPickerProduct?.id === product.id;
                const pricing = getProductPricing(product);
                const stockFull =
                  !hasVariations &&
                  cartQty >= product.stock &&
                  product.stock > 0;
                const isDisabled = stockFull || product.stock === 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (!isDisabled) handleProductClick(product);
                    }}
                    className={cn(
                      'group flex flex-col rounded-lg border overflow-hidden transition-all',
                      isDisabled
                        ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-100'
                        : isActive
                          ? 'cursor-pointer border-primary ring-2 ring-primary/40 shadow-md bg-white'
                          : inCart
                            ? 'cursor-pointer border-primary/30 ring-1 ring-primary/20 shadow-sm hover:shadow-md bg-white'
                            : 'cursor-pointer border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md bg-white',
                    )}
                  >
                    {/* Image area */}
                    <div
                      className={cn(
                        'relative overflow-hidden rounded-t-lg p-2',
                        inCart ? 'bg-primary/5' : 'bg-gray-50',
                      )}
                    >
                      <div className='relative w-full aspect-3/2 rounded-md overflow-hidden'>
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className='object-contain p-2'
                          />
                        ) : (
                          <div className='flex items-center justify-center h-full bg-gray-100 rounded-md'>
                            <Package className='size-8 text-gray-300' />
                          </div>
                        )}

                        {/* Stock badge — top right */}
                        {product.stock > 0 ? (
                          <span
                            className={cn(
                              'absolute top-1.5 right-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-full leading-none shadow-sm',
                              product.stock <= 5
                                ? 'bg-rose-500 text-white'
                                : 'bg-emerald-500 text-white',
                            )}
                          >
                            {product.stock} In Stock
                          </span>
                        ) : (
                          <span className='absolute top-1.5 right-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-full leading-none shadow-sm bg-gray-500 text-white'>
                            Out of Stock
                          </span>
                        )}

                        {/* In-cart badge — top left */}
                        {inCart && (
                          <div className='absolute top-1.5 left-1.5 bg-primary text-white px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm'>
                            {cartQty}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div
                      className={cn(
                        'px-2.5 py-2 sm:px-3 sm:py-2.5 flex flex-col gap-0.5 flex-1',
                        inCart ? 'bg-primary/5 bg-opacity-30' : 'bg-white',
                      )}
                    >
                      <p className='text-[10px] sm:text-[11px] text-gray-400 font-medium uppercase tracking-wide truncate'>
                        SKU: {product.sku || 'N/A'}
                      </p>
                      <h3
                        className={cn(
                          'text-[11px] sm:text-[13px] font-bold leading-snug flex-1',
                          'text-gray-900',
                        )}
                      >
                        {product.name}
                      </h3>

                      <div className='flex items-center justify-between mt-1.5'>
                        <div className='flex items-baseline gap-1.5 min-w-0 flex-wrap'>
                          <span className='text-base sm:text-lg xl:text-base 2xl:text-xl font-bold text-primary leading-none'>
                            ৳{pricing.final.toFixed(2)}
                          </span>
                          {pricing.final < pricing.base && (
                            <span className='text-[11px] sm:text-xs text-gray-400 line-through leading-none'>
                              ৳{pricing.base.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {hasVariations ? (
                          <span className='text-[9px] sm:text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded-full uppercase shrink-0 ml-1'>
                            {product.productVariations.length} opts
                          </span>
                        ) : null}
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
        <div className='lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-gray-300 px-3 py-2.5 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between'>
          <div>
            <p className='text-xs font-bold text-gray-900'>
              {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
            </p>
            <p className='text-base font-bold text-primary'>
              ৳{finalComputedTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className='flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-sm text-sm font-bold hover:bg-primary/90 transition'
          >
            <ShoppingCart className='size-4' />
            View Order
          </button>
        </div>
      )}

      {/* ════════════ RIGHT: Order Panel ════════════ */}
      <div
        className={cn(
          'w-full lg:w-[420px] xl:w-[460px] 2xl:w-[600px] shrink-0 bg-white flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200 h-full min-h-0 overflow-hidden',
          isCartOpen || variantPickerProduct
            ? 'absolute inset-0 z-50 lg:static lg:z-auto'
            : 'hidden lg:flex',
        )}
      >
        {/* ── Variant Picker Panel (replaces cart when open) ── */}
        {variantPickerProduct ? (
          <>
            {/* Header */}
            <div className='p-4 border-b border-gray-300 bg-gray-50 flex items-center justify-between shrink-0'>
              <div className='flex items-center gap-2 min-w-0'>
                <button
                  onClick={() => setVariantPickerProduct(null)}
                  className='shrink-0 p-1 hover:bg-gray-200 rounded-sm text-gray-600'
                >
                  <ChevronLeft className='size-4' />
                </button>
                <div className='min-w-0'>
                  <p className='text-xs text-gray-500 font-medium uppercase'>
                    Select Options
                  </p>
                  <p className='text-sm font-bold text-gray-900 truncate'>
                    {variantPickerProduct.name}
                  </p>
                </div>
              </div>
              <button
                className='lg:hidden p-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-sm'
                onClick={() => {
                  setVariantPickerProduct(null);
                  setIsCartOpen(false);
                }}
              >
                <X className='size-5' />
              </button>
            </div>

            {/* Product preview */}
            <div className='p-4 border-b border-gray-200 bg-white shrink-0 flex gap-3 items-center'>
              <div className='size-14 bg-gray-100 border border-gray-200 shrink-0 relative overflow-hidden rounded-sm'>
                {variantPickerProduct.image ? (
                  <Image
                    src={variantPickerProduct.image}
                    alt={variantPickerProduct.name}
                    fill
                    className='object-contain p-1'
                  />
                ) : (
                  <div className='size-full flex items-center justify-center'>
                    <Package className='size-6 text-gray-300' />
                  </div>
                )}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-xs text-gray-400 uppercase font-bold truncate'>
                  {variantPickerProduct.sku}
                </p>
                <p className='text-sm font-bold text-gray-900 leading-tight line-clamp-2'>
                  {variantPickerProduct.name}
                </p>
                <p className='text-sm font-bold text-gray-900 mt-0.5'>
                  ৳{getProductPricing(variantPickerProduct).final.toFixed(0)}
                </p>
              </div>
            </div>

            {/* Variants grid */}
            <div className='flex-1 overflow-y-auto p-4'>
              <p className='text-xs font-bold text-gray-500 uppercase mb-3'>
                {variantPickerProduct.productVariations.length} Available
                Options — tap to add
              </p>
              <div className='grid grid-cols-2 gap-2'>
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
                        'flex flex-col items-start p-3 border rounded-sm text-left transition-colors',
                        vInCart
                          ? 'bg-green-50 border-green-500 text-green-800'
                          : 'bg-white border-gray-200 text-gray-800 hover:border-primary hover:bg-primary/5',
                      )}
                    >
                      <div className='flex items-center justify-between w-full mb-1'>
                        <span className='text-xs font-bold truncate'>
                          {v.attributeValue}
                        </span>
                        {vInCart ? (
                          <span className='bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 shrink-0'>
                            ×{vQty}
                          </span>
                        ) : (
                          <Plus className='size-3.5 text-gray-400 shrink-0' />
                        )}
                      </div>
                      <span className='text-xs font-semibold text-gray-600'>
                        ৳{pricing.final.toFixed(0)}
                        {pricing.final < pricing.base && (
                          <span className='text-[10px] text-gray-400 line-through ml-1'>
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
            <div className='p-4 border-t border-gray-300 bg-gray-50 shrink-0'>
              {(() => {
                const selectedCount =
                  variantPickerProduct.productVariations.filter((v) =>
                    cart.has(cartKey(variantPickerProduct.id, v.id)),
                  ).length;
                return (
                  <button
                    onClick={() => setVariantPickerProduct(null)}
                    className={cn(
                      'w-full py-2.5 font-bold text-sm rounded-sm flex items-center justify-center gap-2 transition-colors',
                      selectedCount > 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300',
                    )}
                  >
                    <Check className='size-4' />
                    {selectedCount > 0
                      ? `Done — ${selectedCount} option${selectedCount > 1 ? 's' : ''} added`
                      : 'Close'}
                  </button>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            {/* ── Cart Header ── */}
            <div className='px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0'>
              <h2 className='text-base font-bold text-gray-900'>
                {isEditMode ? 'Editing Order' : 'Current Order'}
              </h2>
              <div className='flex items-center gap-3'>
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className='text-sm font-semibold text-red-500 hover:text-red-600 transition-colors'
                  >
                    Clear All
                  </button>
                )}
                <button
                  className='lg:hidden p-1.5 text-gray-500 hover:text-gray-800 transition-colors'
                  onClick={() => setIsCartOpen(false)}
                >
                  <X className='size-5' />
                </button>
              </div>
            </div>

            {/* ── Order Items List ── */}
            <div className='flex-1 overflow-y-auto bg-white'>
              {cartItems.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full text-center p-6 text-gray-400'>
                  <ShoppingCart className='size-12 mb-3 text-gray-200' />
                  <p className='text-sm font-semibold text-gray-600'>
                    Cart is empty
                  </p>
                  <p className='text-xs mt-1 text-gray-400'>
                    Select items from the product list to begin.
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  {cartItems.map(([key, item]) => {
                    const exceedsStock = item.quantity > item.stock;
                    return (
                      <div
                        key={key}
                        className='flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors'
                      >
                        {/* Thumbnail */}
                        <div className='size-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden relative'>
                          {item.productImage ? (
                            <Image
                              src={item.productImage}
                              alt=''
                              fill
                              className='object-cover'
                            />
                          ) : (
                            <div className='flex items-center justify-center h-full'>
                              <Package className='size-4 text-gray-300' />
                            </div>
                          )}
                        </div>

                        {/* Name + unit price — wraps naturally, never pushes siblings */}
                        <div className='flex-1 min-w-0 overflow-hidden'>
                          <p className='text-[13px] font-semibold text-gray-900 leading-tight'>
                            {item.productName}
                          </p>
                          {item.variationLabel && (
                            <p className='text-[10px] text-primary/70 font-medium'>
                              {item.variationLabel}
                            </p>
                          )}
                          <p className='text-[10px] text-gray-500 mt-0.5'>
                            ৳{item.unitPrice.toFixed(2)} / unit
                          </p>
                        </div>

                        {/* Qty stepper — pushed to right */}
                        <div className='flex flex-col items-center shrink-0 ml-auto'>
                          <div className='flex items-center'>
                            <button
                              onClick={() => updateQuantity(key, -1)}
                              className={cn(
                                'w-7 h-7 rounded-l border flex items-center justify-center transition-colors',
                                exceedsStock
                                  ? 'border-red-300 text-red-400 hover:bg-red-50'
                                  : 'border-gray-300 text-gray-500 hover:bg-gray-100',
                              )}
                            >
                              <Minus className='size-3' />
                            </button>
                            <input
                              type='number'
                              min='1'
                              max={item.stock}
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                if (valStr === '') {
                                  setItemQuantity(key, 0);
                                  return;
                                }
                                const val = parseInt(valStr, 10);
                                if (!isNaN(val)) setItemQuantity(key, val);
                              }}
                              onBlur={() => {
                                if (item.quantity === 0)
                                  setItemQuantity(key, 1);
                              }}
                              className={cn(
                                'w-14 h-7 text-center text-sm font-semibold border-y bg-white outline-none',
                                exceedsStock
                                  ? 'text-red-600 border-red-300 bg-red-50'
                                  : 'text-gray-900 border-gray-300',
                              )}
                            />
                            <button
                              onClick={() => updateQuantity(key, 1)}
                              className={cn(
                                'w-7 h-7 rounded-r border flex items-center justify-center transition-colors',
                                exceedsStock
                                  ? 'border-red-300 text-red-400 hover:bg-red-50'
                                  : 'border-gray-300 text-gray-500 hover:bg-gray-100',
                              )}
                            >
                              <Plus className='size-3' />
                            </button>
                          </div>
                          {/* Stock exceeded error */}
                          {exceedsStock && (
                            <span className='text-[10px] text-red-600 font-medium mt-1 leading-tight whitespace-nowrap'>
                              Only {item.stock} in stock
                            </span>
                          )}
                        </div>

                        {/* Line total + remove — pushed to far right */}
                        <div className='flex items-center gap-1.5 shrink-0 ml-auto'>
                          <div className='flex flex-col items-end justify-center'>
                            <span className='text-[13px] xl:text-[13px] 2xl:text-[15px] font-bold text-primary whitespace-nowrap'>
                              ৳{(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                            {item.unitPrice < item.basePrice && (
                              <span className='text-[10px] text-gray-400 line-through leading-none'>
                                ৳{(item.basePrice * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(key)}
                            className='text-red-400 hover:text-red-500 transition-colors'
                            title='Remove'
                          >
                            <X className='size-4' />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Summary + Actions ── */}
            {cartItems.length > 0 && (
              <div className='bg-gray-50 border-t border-gray-200 px-4 py-2 shrink-0 space-y-1.5'>
                {/* Customer info summary */}
                {(customerName || customerPhone || selectedPosCustomer) && (
                  <div className='flex items-center gap-2 px-2 py-1.5 bg-white rounded-md border border-gray-200'>
                    <div className='size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
                      <span className='text-[10px] font-bold text-primary'>
                        {(customerName || 'C').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className='min-w-0'>
                      <p className='text-xs font-semibold text-gray-700 truncate'>
                        {customerName || 'Walk-in Customer'}
                      </p>
                      {customerPhone && (
                        <p className='text-[10px] text-gray-400 truncate'>
                          {customerPhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Discount type, value and tax */}
                <div className='grid grid-cols-2 xl:grid-cols-3 gap-2'>
                  <div>
                    <label className='block text-[13px] text-gray-500 font-medium mb-0.5'>
                      Discount Type
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => {
                        const v = e.target.value as typeof discountType;
                        setDiscountType(v);
                        if (v === 'NONE') setDiscountValue(0);
                      }}
                      className='w-full h-7 rounded-md border border-gray-300 bg-white text-[13px] text-gray-700 px-2 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary'
                    >
                      <option value='NONE'>No Discount</option>
                      <option value='PERCENTAGE_DISCOUNT'>% Discount</option>
                      <option value='FLAT_DISCOUNT'>Flat</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-[13px] text-gray-500 font-medium mb-0.5'>
                      Disc. Value
                    </label>
                    <input
                      type='number'
                      min='0'
                      placeholder='0'
                      value={discountValue || ''}
                      disabled={discountType === 'NONE'}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className='w-full h-7 rounded-md border border-gray-300 bg-white text-[13px] text-gray-900 px-2 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-gray-100 disabled:text-gray-400'
                    />
                  </div>
                  <div className='col-span-2 xl:col-span-1'>
                    <label className='block text-[13px] text-gray-500 font-medium mb-0.5'>
                      Tax (%)
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='100'
                      placeholder='0'
                      value={taxPercent || ''}
                      onChange={(e) =>
                        setTaxPercent(Math.max(0, Number(e.target.value)))
                      }
                      className='w-full h-7 rounded-md border border-gray-300 bg-white text-[13px] text-gray-900 px-2 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary'
                    />
                  </div>
                </div>

                {/* Breakdown rows */}
                <div className='space-y-0.5'>
                  <div className='flex justify-between text-[13px] xl:text-[13px] 2xl:text-base text-gray-700'>
                    <span>Subtotal ({cartTotalQty} items)</span>
                    <span className='font-bold'>৳{cartTotal.toFixed(2)}</span>
                  </div>
                  {discountType !== 'NONE' && discountValue > 0 && (
                    <div className='flex justify-between text-[13px] xl:text-[13px] 2xl:text-base text-gray-700'>
                      <span>
                        Discount
                        {discountType === 'PERCENTAGE_DISCOUNT'
                          ? ` (${discountValue}%)`
                          : ' (flat)'}
                      </span>
                      <span className='text-rose-500 font-bold'>
                        −৳{(cartTotal - subtotalAfterDiscount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {taxPercent > 0 && (
                    <div className='flex justify-between text-[13px] xl:text-[13px] 2xl:text-base text-gray-700'>
                      <span>Tax ({taxPercent}%)</span>
                      <span className='font-bold'>৳{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className='flex justify-between items-center border-t border-gray-200 pt-1.5'>
                  <span className='text-lg font-bold text-gray-800'>Total</span>
                  <span className='text-xl xl:text-xl 2xl:text-2xl font-bold text-primary'>
                    ৳{finalComputedTotal.toFixed(2)}
                  </span>
                </div>

                {/* Buttons */}
                <div className='grid grid-cols-2 gap-2 pb-1'>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={
                      isSubmitting || cartItems.length === 0 || hasStockErrors
                    }
                    className='flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl py-2.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
                  >
                    {isSubmitting ? (
                      <span className='size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                    ) : (
                      <ShoppingCart className='size-3.5' />
                    )}
                    Complete Sale
                  </button>
                  <button
                    onClick={() => {
                      handleSubmit();
                      if (
                        typeof window !== 'undefined' &&
                        window.innerWidth < 1024
                      )
                        setIsCartOpen(false);
                    }}
                    disabled={
                      isSubmitting || cartItems.length === 0 || hasStockErrors
                    }
                    className='flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-600 text-xs font-semibold rounded-xl py-2.5 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
                  >
                    {isSubmitting ? (
                      <span className='size-3.5 border-2 border-gray-400/50 border-t-gray-600 rounded-full animate-spin' />
                    ) : (
                      <Printer className='size-3.5' />
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
          onConfirm={(payments: import('@/hooks/pos.api').PosPayment[]) => {
            setIsPaymentModalOpen(false);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsCartOpen(false);
            }
            handleSubmit(payments);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* ════════════ SUCCESS MODAL ════════════ */}
      {successBill && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'>
            <div className='bg-green-600 p-6 flex flex-col items-center justify-center text-white'>
              <div className='w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4'>
                <Check className='size-8 text-white' />
              </div>
              <h2 className='text-2xl font-bold'>Order Successful!</h2>
              <p className='text-green-100 mt-1'>
                Invoice: {successBill.invoiceNumber}
              </p>
            </div>

            <div className='p-6 flex flex-col gap-3'>
              <div className='flex justify-between items-center text-sm mb-4'>
                <span className='text-gray-500 font-medium'>Total Amount:</span>
                <span className='font-bold text-xl text-gray-900'>
                  ৳{successBill.finalAmount.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => {
                  import('@/utils/posPrint').then((m) =>
                    m.printPosReceipt(successBill),
                  );
                }}
                className='w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-md font-bold hover:bg-primary/90 transition'
              >
                <Printer className='size-5' />
                Print POS Receipt
              </button>

              <button
                onClick={() => {
                  setSuccessBill(null);
                  if (
                    typeof window !== 'undefined' &&
                    window.innerWidth < 1024
                  ) {
                    setIsCartOpen(false);
                  }
                  router.push('/dashboard/pos-order/manage');
                }}
                className='w-full bg-gray-100 text-gray-700 py-3 rounded-md font-bold hover:bg-gray-200 transition mt-1'
              >
                Go to Orders
              </button>

              <button
                onClick={() => {
                  setSuccessBill(null);
                  if (
                    typeof window !== 'undefined' &&
                    window.innerWidth < 1024
                  ) {
                    setIsCartOpen(false);
                  }
                  if (isEditMode) {
                    router.push('/dashboard/pos-order/create');
                  } else {
                    setSearchInput('');
                    setActiveCategory(null);
                  }
                }}
                className='w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-md font-bold hover:bg-gray-50 transition'
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
