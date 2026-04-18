import { 
  LuLayoutDashboard, 
  LuBox, 
  LuShoppingCart, 
  LuUsers, 
  LuLayers, 
  LuTicketPercent, 
  LuGlobe, 
  LuTruck,
  LuImage, 
  LuSettings,
  LuList
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
    icon: LuBox,
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
        label: "Product Sub-Categories",
        href: "/dashboard/categories/product-subcategories/manage",
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
    label: "Manage Orders",
    href: "/dashboard/orders",
  },
   {
    icon: LuLayers,
    label: "Inventory",
    href: "",
    subItems: [
      {
        label: "Manage Stock",
        href: "/dashboard/stocks/manage",
      },
      {
        label: "Stock Transfers",
        href: "/dashboard/stock-transfers/manage",
      },
      {
        label: "Suppliers",
        href: "/dashboard/suppliers",
      },
      {
        label: "Store/Branch",
        href: "/dashboard/stores",
      },
    ],
  },
  {
    icon: LuUsers,
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
    label: "Shipping Management",
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
    icon: LuImage,
    label: "Blogs",
    href: "/dashboard/blog/manage",
    subItems: [
      { label: "Create Blog", href: "/dashboard/blog/create" },
      { label: "Manage Blogs", href: "/dashboard/blog/manage" },
      { label: "Blog Categories", href: "/dashboard/categories/blog-categories/manage" },
      { label: "Blog Tags", href: "/dashboard/tags/blog-tags/manage" },
    ],
  },
  // --- Users ---
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
      { label: "Company Information", href: "/dashboard/web/company-information" },
      { label: "Company Policy", href: "/dashboard/web/company-policy" },
      { label: "Manage Sliders", href: "/dashboard/web/slider" },
      { label: "Manage FAQs", href: "/dashboard/web/faq" },
      { label: "Manage Testimonials", href: "/dashboard/web/testimonial" },
      { label: "Social Media Link", href: "/dashboard/web/social-media" },
    ],
  },
  // {
  //   icon: LuSettings,
  //   label: "Settings",
  //   href: "/admin/settings",
  // },
];