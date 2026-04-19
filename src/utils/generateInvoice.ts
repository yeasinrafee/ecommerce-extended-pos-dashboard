/**
 * Invoice Generator — Zayrah
 * npm install jspdf jspdf-autotable
 */

import { CompanyInformation } from "@/hooks/web.api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ZonePolicy {
  id: string;
  policyName: string;
  deliveryTime: number;
  shippingCost: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface SelectedAttribute {
  attributeName: string;
  attributeValue: string;
}
export interface ZonePolicyEntry {
  zonePolicyId: string;
  zoneId: string;
  assignedAt: string;
  zonePolicy: ZonePolicy;
}
export interface Zone {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  zonePolicies: ZonePolicyEntry[];
}
export interface Address {
  id: string;
  customerId: string;
  zoneId: string;
  postCode: string;
  flatNumber: string;
  streetAddress: string;
  createdAt: string;
  updatedAt: string;
  zone: Zone;
}
export interface Customer {
  id: string;
  userId: string;
  name: string;
  image: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  Baseprice: number;
  finalPrice: number;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number | null;
  stock: number;
  avgRating: number;
  totalRatings: number;
  totalReviews: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  sku: string;
  discountStartDate: string | null;
  discountEndDate: string | null;
  brandId: string;
  image: string;
  galleryImages: string[];
  status: string;
  stockStatus: string;
  createdAt: string;
  updatedAt: string;
}
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  Baseprice: number;
  finalPrice: number;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
  variations: unknown[];
  selectedAttributes?: SelectedAttribute[];
}
export interface OrderData {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressId: string;
  baseAmount: number;
  promoId: string | null;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  baseShippingCharge: number;
  extraShippingCharge: number;
  finalShippingCharge: number;
  orderStatus:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  totalWeight: number;
  totalVolume: number;
  chargePerWeight: number | null;
  chargePerVolume: number | null;
  weightUnit: string | null;
  volumeUnit: string | null;
  deliveryTime: number;
  expectedDeliveryDate: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  promo: unknown | null;
  address: Address;
  orderItems: OrderItem[];
  zonePolicy: ZonePolicy;
  paymentStatus?: "PAID" | "PENDING" | "DUE";
  totalPaid?: number;
  dueAmount?: number;
  payments?: { paymentMethod: string; amount: number }[];
}
export interface InvoiceOptions {
  download?: boolean;
  filename?: string;
}

type RGB = [number, number, number];

// ── Fallback company defaults ────────────────────────────────────────────────
const COMPANY_DEFAULTS = {
  name: "Zayrah",
  tagline: "Premium Fashion & Lifestyle",
  address: "House 12, Road 5, Mirpur-10, Dhaka-1216, Bangladesh",
  phone: "+880 1700-000000",
  email: "support@zayrah.com",
  website: "www.zayrah.com",
  logo: "/logo.png",
} as const;

const STATUS_COLOR: Record<string, RGB> = {
  PENDING: [234, 179, 8],
  CONFIRMED: [59, 130, 246],
  PROCESSING: [168, 85, 247],
  SHIPPED: [20, 184, 166],
  DELIVERED: [22, 163, 74],
  CANCELLED: [239, 68, 68],
};

const C: Record<string, RGB> = {
  hdr: [15, 23, 42],
  accent: [99, 102, 241],
  dark: [15, 23, 42],
  muted: [100, 116, 139],
  light: [241, 245, 249],
  white: [255, 255, 255],
  border: [226, 232, 240],
};

const fmt = (n: number) =>
  `£${Number(n).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const shortId = (id: string) => id?.slice(0, 8).toUpperCase();

const loadLogo = (
  src: string,
): Promise<{ b64: string; w: number; h: number } | null> =>
  new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      res({
        b64: c.toDataURL("image/png"),
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.onerror = () => res(null);
    img.src = src;
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractOrder(raw: any): OrderData | null {
  if (!raw) return null;
  if (raw.id && Array.isArray(raw.orderItems)) return raw as OrderData;
  if (raw.data?.id && Array.isArray(raw.data?.orderItems))
    return raw.data as OrderData;
  if (raw.data?.data?.id && Array.isArray(raw.data?.data?.orderItems))
    return raw.data.data as OrderData;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateInvoice(
  rawOrder: any,
  options: InvoiceOptions = {},
  companyInfo?: CompanyInformation | null,
): Promise<void> {
  const order = extractOrder(rawOrder);
  if (!order) {
    // console.error("[generateInvoice] Bad data:", rawOrder);
    throw new Error("generateInvoice: invalid order data");
  }

  // ── Resolve company details with fallback ──────────────────────────────────
  const company = {
    name: COMPANY_DEFAULTS.name,
    tagline: COMPANY_DEFAULTS.tagline,
    address: companyInfo?.address ?? COMPANY_DEFAULTS.address,
    phone: companyInfo?.phone ?? COMPANY_DEFAULTS.phone,
    email: companyInfo?.email ?? COMPANY_DEFAULTS.email,
    website: COMPANY_DEFAULTS.website,
    logo: companyInfo?.logo ?? COMPANY_DEFAULTS.logo,
  };

  const { download = true, filename } = options;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW = doc.internal.pageSize.getWidth(),
    PH = doc.internal.pageSize.getHeight(),
    M = 15,
    HH = 46;

  // ── LOGO ───────────────────────────────────────────────────────────────────
  const logo = await loadLogo(company.logo);

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.hdr);
  doc.rect(0, 0, PW, HH, "F");
  doc.setFillColor(...C.accent);
  doc.rect(0, HH - 0.8, PW, 0.8, "F");

  // Logo — aspect-ratio safe, centred in header
  const BOX = 30;
  if (logo) {
    const r = logo.w / logo.h;
    let lw = BOX,
      lh = BOX;
    if (r > 1) {
      lh = BOX / r;
    } else {
      lw = BOX * r;
    }
    doc.addImage(logo.b64, "PNG", M, (HH - lh) / 2, lw, lh);
  } else {
    // Fallback: company name initials
    const initials = company.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    doc.setTextColor(...C.white);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(initials, M + 15, HH / 2 + 3, { align: "center" });
  }

  // Company text (dynamic)
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(company.name, PW - M, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 190, 210);
  doc.text(company.tagline, PW - M, 20, { align: "right" });
  doc.text(company.address, PW - M, 26.5, { align: "right" });
  doc.text(`${company.phone}  ·  ${company.email}`, PW - M, 33, {
    align: "right",
  });
  doc.text(company.website, PW - M, 39.5, { align: "right" });

  // ── INVOICE HEADING ─────────────────────────────────────────────────────────
  let y = HH + 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...C.dark);
  doc.text("INVOICE", M, y);
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.9);
  doc.line(M, y + 2.5, M + 43, y + 2.5);

  // ── STATUS ──────────────────────────────────────────────────────────────────
  const dotClr: RGB = STATUS_COLOR[order.orderStatus] ?? C.muted;
  const statusLabel =
    order.orderStatus.charAt(0) + order.orderStatus.slice(1).toLowerCase();
  doc.setFillColor(...dotClr);
  doc.circle(M + 49, y - 2.5, 2.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...dotClr);
  doc.text(statusLabel, M + 53.5, y - 1);

  // ── META right side ─────────────────────────────────────────────────────────
  const mX = PW - M;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("Invoice No:", mX - 52, y - 8);
  doc.text("Order Date:", mX - 52, y - 2);
  doc.text("Expected Delivery:", mX - 52, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.dark);
  doc.text(`#${shortId(order.id)}`, mX, y - 8, { align: "right" });
  doc.text(fmtDate(order.createdAt), mX, y - 2, { align: "right" });
  doc.text(fmtDate(order.expectedDeliveryDate), mX, y + 4, { align: "right" });

  // ── DIVIDER ─────────────────────────────────────────────────────────────────
  y += 13;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(M, y, PW - M, y);
  y += 8;

  // ── CARDS ───────────────────────────────────────────────────────────────────
  const cW = (PW - 2 * M - 8) / 2;
  const drawCard = (cx: number, title: string, bg: RGB) => {
    doc.setFillColor(...C.light);
    doc.roundedRect(cx, y, cW, 34, 2, 2, "F");
    doc.setFillColor(...bg);
    doc.roundedRect(cx, y, cW, 7.5, 2, 2, "F");
    doc.rect(cx, y + 4.5, cW, 3, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(title, cx + 5, y + 5.3);
  };

  drawCard(M, "BILL TO", C.hdr);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(order.customerName ?? "N/A", M + 5, y + 14.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(order.customerEmail ?? "—", M + 5, y + 21);
  doc.text(order.customerPhone ?? "—", M + 5, y + 27.5);

  const cX2 = M + cW + 8;
  drawCard(cX2, "SHIP TO", [51, 65, 85]);
  const addr = order.address;
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(addr?.zone?.name ?? "N/A", cX2 + 5, y + 14.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  if (addr) {
    const st = [addr.flatNumber, addr.streetAddress].filter(Boolean).join(", ");
    doc.text(st, cX2 + 5, y + 21);
    doc.text(`Post Code: ${addr.postCode ?? ""}`, cX2 + 5, y + 27.5);
  }

  y += 42;

  // ── TABLE ───────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.dark);
  doc.text("Order Items", M, y);
  y += 4;

  const rows = order.orderItems.map((item, idx) => {
    const attrs =
      item.selectedAttributes && item.selectedAttributes.length > 0
        ? item.selectedAttributes
            .map((a) => `${a.attributeName}: ${a.attributeValue}`)
            .join(", ")
        : "—";

    return [
      idx + 1,
      item.product?.name ?? "—",
      item.product?.sku ?? "—",
      item.quantity,
      fmt(item.finalPrice),
      item.discountType !== "NONE" ? `${item.discountValue}` : "—",
      attrs,
      fmt(item.finalPrice * item.quantity),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        "#",
        "Product",
        "SKU",
        "Qty",
        "Unit Price",
        "Discount",
        "Attributes",
        "Total",
      ],
    ],
    body: rows,
    margin: { left: M, right: M },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: C.dark as [number, number, number],
      lineColor: C.border as [number, number, number],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: C.hdr as [number, number, number],
      textColor: C.white as [number, number, number],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 45, halign: "left" },
      2: { cellWidth: 22, halign: "left" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 30, halign: "center" },
      7: { cellWidth: 22, halign: "center" },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  const sX = PW - M - 78,
    sW = 78,
    rH = 8;
  const sumRows: [string, string][] = [
    ["Subtotal", fmt(order.baseAmount)],
    ["Shipping", fmt(order.finalShippingCharge)],
    [
      "Order Discount",
      order.discountAmount > 0 ? `-${fmt(order.discountAmount)}` : "—",
    ],
  ];

  // Defensive Payment Calculations
  const paymentsPool = order.payments || [];
  const calculatedPaid = paymentsPool.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const displayPaid =
    order.totalPaid !== undefined ? order.totalPaid : calculatedPaid;
  const displayDue =
    order.dueAmount !== undefined
      ? order.dueAmount
      : order.finalAmount - displayPaid;

  if (displayPaid > 0) {
    sumRows.push(["Paid Amount", fmt(displayPaid)]);
  }
  if (displayDue > 0.01) {
    sumRows.push(["Due Balance", fmt(displayDue)]);
  }
  doc.setFillColor(...C.light);
  doc.roundedRect(sX, y, sW, rH * sumRows.length + rH + 4, 2, 2, "F");
  let sy = y + 7;
  sumRows.forEach(([l, v]) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(l, sX + 5, sy);
    doc.setTextColor(...C.dark);
    doc.text(v, sX + sW - 5, sy, { align: "right" });
    sy += rH;
  });
  doc.setFillColor(...C.hdr);
  doc.roundedRect(sX, sy - 2, sW, rH + 3, 2, 2, "F");
  doc.rect(sX, sy - 2, sW, 3, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("TOTAL", sX + 5, sy + 4.5);
  doc.text(fmt(order.finalAmount), sX + sW - 5, sy + 4.5, { align: "right" });

  if (order.payments && order.payments.length > 0) {
    const methods = Array.from(
      new Set(paymentsPool.map((p) => p.paymentMethod)),
    ).filter(Boolean);
    const methodStr = methods.length > 0 ? methods.join(", ") : "CASH";
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(`Payment Method: ${methodStr}`, sX + 5, sy + 11.5);
  }

  y = sy + rH + 15;

  // ── DELIVERY STRIP ──────────────────────────────────────────────────────────
  doc.setFillColor(...C.light);
  doc.roundedRect(M, y, PW - 2 * M, 16, 2, 2, "F");
  const infoItems: [string, string][] = [
    ["Delivery Zone", order.address?.zone?.name ?? "—"],
    ["Delivery Time", `${order.deliveryTime} Days`],
    ["Zone Policy", order.zonePolicy?.policyName ?? "—"],
    ["Total Weight", `${order.totalWeight} g`],
  ];
  const iW = (PW - 2 * M) / infoItems.length;
  infoItems.forEach(([l, v], i) => {
    const ix = M + i * iW + iW / 2;
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(l, ix, y + 6, { align: "center" });
    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(v, ix, y + 12, { align: "center" });
  });

  y += 24;

  // ── THANK YOU ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  doc.text(
    `Thank you for shopping with ${company.name}! For any queries, please contact our support team.`,
    PW / 2,
    y,
    { align: "center" },
  );

  // ── FOOTER (dynamic) ────────────────────────────────────────────────────────
  const fY = PH - 11;
  doc.setFillColor(...C.hdr);
  doc.rect(0, fY, PW, 11, "F");
  doc.setFillColor(...C.accent);
  doc.rect(0, fY, PW, 0.8, "F");
  doc.setTextColor(180, 190, 210);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `${company.name}  ·  ${company.website}  ·  ${company.phone}  ·  Generated on ${new Date().toLocaleDateString("en-GB")}`,
    PW / 2,
    fY + 7,
    { align: "center" },
  );

  // ── OUTPUT ──────────────────────────────────────────────────────────────────
  const fn =
    filename ??
    `Invoice_${shortId(order.id)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) {
    doc.save(fn);
  } else {
    const b = doc.output("blob");
    window.open(URL.createObjectURL(b), "_blank");
  }
}
