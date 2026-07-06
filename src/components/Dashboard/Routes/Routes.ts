import {
  LuLayoutDashboard,
  LuPackage,
  LuShoppingCart,
  LuWarehouse,
  LuTicketPercent,
  LuGlobe,
  LuTruck,
  LuNewspaper,
  LuLandmark,
  LuUserCog,
  LuStore,
  LuHandshake,
} from "react-icons/lu";

export interface RouteItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  subItems?: {
    label: string;
    href: string;
    active?: boolean;
  }[];
}

export const routes: RouteItem[] = [
  {
    icon: LuLayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  // --- Products ---
  {
    icon: LuPackage,
    label: "Products",
    href: "/dashboard/products",
    subItems: [
      {
        label: "Create Product",
        href: "/dashboard/product/create",
      },
      {
        label: "Manage Products",
        href: "/dashboard/product/manage",
      },
      {
        label: "Product Categories",
        href: "/dashboard/categories/product-categories/manage",
      },
      {
        label: "Product Tags",
        href: "/dashboard/tags/product-tags/manage",
      },
      {
        label: "Manage Attributes",
        href: "/dashboard/attributes/manage",
      },
      {
        label: "Manage Brands",
        href: "/dashboard/brands/manage",
      },
    ],
  },
  // --- Orders ---
  {
    icon: LuShoppingCart,
    label: "Web Orders",
    href: "/dashboard/orders",
  },
  {
    icon: LuStore,
    label: "POS Order",
    href: "/dashboard/pos-order",
    subItems: [
      {
        label: "Create POS Order",
        href: "/dashboard/pos-order/create",
      },
      {
        label: "Manage POS Order",
        href: "/dashboard/pos-order/manage",
      },
    ],
  },
  // --- Purchases & Suppliers ---
  {
    icon: LuHandshake,
    label: "Purchases & Suppliers",
    href: "",
    subItems: [
      {
        label: "Suppliers",
        href: "/inventory/suppliers",
      },
      {
        label: "Purchase Orders",
        href: "/inventory/purchases",
      },
      {
        label: "Goods Receive (GRN)",
        href: "/inventory/grn",
      },
      {
        label: "Supplier Returns",
        href: "/inventory/supplier-returns",
      },
      {
        label: "Customer Returns",
        href: "/inventory/customer-returns",
      },
    ],
  },
  // --- Inventory ---
  {
    icon: LuWarehouse,
    label: "Inventory",
    href: "",
    subItems: [
      {
        label: "Dashboard",
        href: "/inventory/dashboard",
      },
      {
        label: "Location-wise Stock",
        href: "/inventory/stocks",
      },
      {
        label: "Manage Locations",
        href: "/inventory/locations",
      },
      // Stock Ledger route is commented out — movement history & audit log
      // is fully covered under the "Movements" tab in Inventory Reports.
      // {
      //   label: "Stock Ledger",
      //   href: "/inventory/stock-ledger",
      // },
      {
        label: "Stock Transfers",
        href: "/inventory/transfers",
      },
      {
        label: "Damage Inventory",
        href: "/inventory/damages",
      },
      {
        label: "Stock Adjustment",
        href: "/inventory/adjustments",
      },
      {
        label: "Low Stock Alert",
        href: "/inventory/reorder",
      },
      {
        label: "Inventory Reports",
        href: "/inventory/reports",
      },
    ],
  },
  {
    icon: LuLandmark,
    label: "Bank Management",
    href: "/dashboard/bank",
  },
  {
    icon: LuUserCog,
    label: "User Management",
    href: "",
    subItems: [
      {
        label: "Manage Admin",
        href: "/dashboard/admin",
      },
      {
        label: "Manage Customers",
        href: "/dashboard/customer/manage",
      },
    ],
  },
  {
    icon: LuTruck,
    label: "Shipping",
    href: "/dashboard/shipping/manage",
    subItems: [
      {
        label: "Manage Zones",
        href: "/dashboard/zones/manage",
      },
      {
        label: "Shipping",
        href: "/dashboard/shipping/manage",
      },
      {
        label: "Create Zone Policy",
        href: "/dashboard/zone-policies/create",
      },
      {
        label: "Manage Zone Policies",
        href: "/dashboard/zone-policies/manage",
      },
    ],
  },
  {
    icon: LuNewspaper,
    label: "Blogs",
    href: "/dashboard/blog/manage",
    subItems: [
      { label: "Create Blog", href: "/dashboard/blog/create" },
      { label: "Manage Blogs", href: "/dashboard/blog/manage" },
      {
        label: "Blog Categories",
        href: "/dashboard/categories/blog-categories/manage",
      },
      { label: "Blog Tags", href: "/dashboard/tags/blog-tags/manage" },
    ],
  },
  {
    icon: LuTicketPercent,
    label: "Promo & Offers",
    href: "/dashboard/promos",
    subItems: [
      {
        label: "Create Promo",
        href: "/dashboard/promo/create",
      },
      {
        label: "Manage Promos",
        href: "/dashboard/promo/manage",
      },
      {
        label: "Create Offer",
        href: "/dashboard/offers/create",
      },
      {
        label: "Manage Offers",
        href: "/dashboard/offers/manage",
      },
    ],
  },
  // --- Web Management ---
  {
    icon: LuGlobe,
    label: "Web Management",
    href: "/dashboard/web",
    subItems: [
      {
        label: "Company Information",
        href: "/dashboard/web/company-information",
      },
      { label: "Company Policy", href: "/dashboard/web/company-policy" },
      { label: "Manage Sliders", href: "/dashboard/web/slider" },
      { label: "Manage FAQs", href: "/dashboard/web/faq" },
      { label: "Manage Testimonials", href: "/dashboard/web/testimonial" },
      { label: "Social Media Link", href: "/dashboard/web/social-media" },
    ],
  },
];
